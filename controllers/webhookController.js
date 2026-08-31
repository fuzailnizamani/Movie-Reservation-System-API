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
      return res.status(400).json({ error: 'Missing reservation_id in Stripe metadata.' });
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE reservations
         SET status = 'confirmed'
         WHERE id = $1`,
        [reservationId]
      );

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
      return res.status(500).json({ error: 'Webhook processing failed.' });
    } finally {
      client.release();
    }
  }

  return res.json({ received: true });
};

module.exports = {
  handleWebhook
};
