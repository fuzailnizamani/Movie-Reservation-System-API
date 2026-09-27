const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const reservationId = paymentIntent.metadata.reservation_id;

    if (!reservationId) {
      return res.status(400).json({
        error: 'Missing reservation_id in Stripe metadata.'
      });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const reservationResult = await client.query(
        `SELECT id, status, payment_intent_id
         FROM reservations
         WHERE id = $1
         FOR UPDATE`,
        [reservationId]
      );

      if (reservationResult.rows.length === 0) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          error: 'Reservation not found.'
        });
      }

      const reservation = reservationResult.rows[0];

      // Already confirmed
      if (
        reservation.status === 'confirmed' ||
        reservation.status === 'paid'
      ) {
        await client.query('COMMIT');

        return res.json({
          received: true,
          message: 'Reservation already confirmed.'
        });
      }

      // Reservation expired before payment completed
      if (reservation.status === 'expired') {
        await client.query('COMMIT');

        console.log(
          `Reservation ${reservationId} expired before payment was completed.`
        );

        try {
          const refund = await stripe.refunds.create(
            {
              payment_intent: paymentIntent.id
            },
            {
              idempotencyKey: `reservation-${reservationId}-refund`
            }
          );

          console.log(
            `Refund created for reservation ${reservationId}. Refund ID: ${refund.id}`
          );

          return res.json({
            received: true,
            message: 'Reservation expired. Payment has been refunded.',
            refundId: refund.id
          });

        } catch (refundError) {
          console.error(
            `Refund failed for reservation ${reservationId}:`,
            refundError.message
          );

          return res.status(500).json({
            error: 'Reservation expired, but refund processing failed.'
          });
        }
      }

      // Prevent unexpected status transitions
      if (reservation.status !== 'pending_payment') {
        await client.query('COMMIT');

        return res.json({
          received: true,
          message: `Reservation cannot be confirmed from status ${reservation.status}.`
        });
      }

      // Confirm reservation
      await client.query(
        `UPDATE reservations
         SET status = 'confirmed',
             payment_intent_id = $1
         WHERE id = $2`,
        [paymentIntent.id, reservationId]
      );

      // Book the reserved seats
      await client.query(
        `UPDATE showtime_seats
         SET status = 'booked'
         WHERE reservation_id = $1`,
        [reservationId]
      );

      await client.query('COMMIT');

      console.log(`Reservation ${reservationId} confirmed.`);

    } catch (error) {
      await client.query('ROLLBACK');

      console.error('Database finalization failed:', error);

      return res.status(500).json({
        error: 'Webhook processing failed.'
      });

    } finally {
      client.release();
    }
  }

  return res.json({ received: true });
};

module.exports = {
  handleWebhook
};