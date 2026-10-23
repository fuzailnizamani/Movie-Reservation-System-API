const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const refundInactiveReservation = async (paymentIntent, reservationId) => {
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntent.id },
      { idempotencyKey: `reservation-${reservationId}-refund-${paymentIntent.id}` }
    );

    if (refund.status === 'succeeded') {
      await db.query(
        `UPDATE reservations
         SET payment_status = 'refunded',
             refunded_at = COALESCE(refunded_at, NOW())
         WHERE id = $1 AND payment_intent_id = $2`,
        [reservationId, paymentIntent.id]
      );
    }

    return refund;
  } catch (error) {
    console.error(`Refund failed for inactive reservation ${reservationId}:`, {
      type: error.type,
      code: error.code,
      requestId: error.requestId
    });
    throw error;
  }
};

const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'refund.updated') {
    const refund = event.data.object;
    if (!refund.payment_intent) return res.json({ received: true });

    const paymentStatus = refund.status === 'succeeded'
      ? 'refunded'
      : ['failed', 'canceled'].includes(refund.status)
        ? 'refund_failed'
        : 'refund_pending';

    try {
      await db.query(
        `UPDATE reservations
         SET payment_status = CASE
               WHEN payment_status = 'refunded' THEN 'refunded'
               WHEN payment_status = 'refund_failed' AND $1 = 'refund_pending' THEN 'refund_failed'
               ELSE $1
             END,
             refunded_at = CASE
               WHEN payment_status = 'refunded' OR $1 = 'refunded' THEN COALESCE(refunded_at, NOW())
               ELSE refunded_at
             END
         WHERE payment_intent_id = $2
           AND payment_status IN ('refund_pending', 'refund_failed', 'refunded')`,
        [paymentStatus, refund.payment_intent]
      );
      return res.json({ received: true });
    } catch (error) {
      console.error('Failed to record refund status:', error);
      return res.status(500).json({ error: 'Webhook processing failed.' });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const reservationId = paymentIntent.metadata?.reservation_id;
    if (!reservationId) return res.status(400).json({ error: 'Missing reservation_id in Stripe metadata.' });

    try {
      await db.query(
        `UPDATE reservations
         SET payment_status = 'failed'
         WHERE id = $1
           AND payment_intent_id = $2
           AND status = 'pending_payment'
           AND payment_status != 'paid'`,
        [reservationId, paymentIntent.id]
      );
      return res.json({ received: true });
    } catch (error) {
      console.error('Failed to record payment failure:', error);
      return res.status(500).json({ error: 'Webhook processing failed.' });
    }
  }

  if (event.type !== 'payment_intent.succeeded') {
    return res.json({ received: true });
  }

  const paymentIntent = event.data.object;
  const reservationId = paymentIntent.metadata?.reservation_id;
  if (!reservationId) {
    return res.status(400).json({ error: 'Missing reservation_id in Stripe metadata.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, status, payment_status, amount, currency, payment_intent_id
       FROM reservations
       WHERE id = $1
       FOR UPDATE`,
      [reservationId]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = rows[0];
    if (
      reservation.payment_intent_id !== paymentIntent.id ||
      paymentIntent.metadata?.reservation_id !== String(reservation.id)
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'PaymentIntent does not match the reservation.' });
    }

    if (
      paymentIntent.status !== 'succeeded' ||
      paymentIntent.amount !== reservation.amount ||
      paymentIntent.currency !== reservation.currency
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment details do not match the reservation.' });
    }

    if (['confirmed', 'paid'].includes(reservation.status)) {
      await client.query('COMMIT');
      return res.json({ received: true, message: 'Reservation already confirmed.' });
    }

    if (['refunded', 'refund_failed'].includes(reservation.payment_status)) {
      await client.query('COMMIT');
      return res.json({
        received: true,
        message: reservation.payment_status === 'refunded'
          ? 'Payment has already been refunded.'
          : 'Refund requires follow-up and will not be retried automatically.'
      });
    }

    if (reservation.status === 'cancelled' && reservation.payment_status === 'paid') {
      await client.query('COMMIT');
      return res.json({ received: true, message: 'Reservation was already paid before cancellation.' });
    }

    const inactive = ['expired', 'cancelled'].includes(reservation.status);
    if (inactive) {
      await client.query(
        `UPDATE reservations
         SET payment_status = 'refund_pending',
             paid_at = COALESCE(paid_at, NOW())
         WHERE id = $1`,
        [reservationId]
      );
      await client.query('COMMIT');

      const refund = await refundInactiveReservation(paymentIntent, reservationId);
      return res.json({
        received: true,
        message: refund.status === 'succeeded'
          ? 'Reservation is inactive. Payment was refunded.'
          : 'Reservation is inactive. Refund processing is pending.'
      });
    }

    if (reservation.status !== 'pending_payment') {
      await client.query('COMMIT');
      return res.json({ received: true, message: 'Reservation cannot be confirmed in its current status.' });
    }

    const heldSeats = await client.query(
      `SELECT seat_id
       FROM showtime_seats
       WHERE reservation_id = $1 AND status = 'pending_payment'
       FOR UPDATE`,
      [reservationId]
    );
    const snapshotSeats = await client.query(
      `SELECT COUNT(*)::integer AS count
       FROM reservation_seats
       WHERE reservation_id = $1`,
      [reservationId]
    );

    if (
      heldSeats.rows.length === 0 ||
      heldSeats.rows.length !== snapshotSeats.rows[0].count
    ) {
      await client.query(
        `UPDATE reservations
         SET status = 'expired',
             payment_status = 'refund_pending',
             paid_at = COALESCE(paid_at, NOW())
         WHERE id = $1`,
        [reservationId]
      );
      await client.query('COMMIT');

      const refund = await refundInactiveReservation(paymentIntent, reservationId);
      return res.json({
        received: true,
        message: refund.status === 'succeeded'
          ? 'The seat hold is no longer active. Payment was refunded.'
          : 'The seat hold is no longer active. Refund processing is pending.'
      });
    }

    await client.query(
      `UPDATE reservations
       SET status = 'confirmed',
           payment_status = 'paid',
           paid_at = COALESCE(paid_at, NOW())
       WHERE id = $1`,
      [reservationId]
    );

    const bookedSeats = await client.query(
      `UPDATE showtime_seats
       SET status = 'booked'
       WHERE reservation_id = $1 AND status = 'pending_payment'`,
      [reservationId]
    );
    if (bookedSeats.rowCount !== snapshotSeats.rows[0].count) {
      throw new Error('Seat inventory changed during payment confirmation.');
    }

    await client.query('COMMIT');
    console.log(`Reservation ${reservationId} confirmed.`);
    return res.json({ received: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Webhook processing failed:', error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  } finally {
    client.release();
  }
};

module.exports = { handleWebhook };
