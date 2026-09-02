const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createReservation = async (req, res) => {
  const { showtimeId, seatIds } = req.body;

  const userId = req.user.userId;

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({
      error: 'No seats selected.'
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const lockQuery = `
      SELECT seat_id, status
      FROM showtime_seats
      WHERE showtime_id = $1
      AND seat_id = ANY($2)
      FOR UPDATE;
    `;

    const { rows } = await client.query(lockQuery, [showtimeId, seatIds]);

    if (rows.length !== seatIds.length) {
      throw new Error('One or more seats are invalid.');
    }

    const isAvailable = rows.every((row) => row.status === 'available');

    if (!isAvailable) {
      throw new Error('One or more seats are no longer available.');
    }

    const insertQuery = `
      INSERT INTO reservations (user_id, showtime_id, status)
      VALUES ($1, $2, 'pending_payment')
      RETURNING id;
    `;

    const reservationRes = await client.query(insertQuery, [userId, showtimeId]);
    const reservationId = reservationRes.rows[0].id;

    const updateQuery = `
      UPDATE showtime_seats
      SET
        status = 'pending_payment',
        reservation_id = $1
      WHERE showtime_id = $2
      AND seat_id = ANY($3);
    `;

    await client.query(updateQuery, [reservationId, showtimeId, seatIds]);
    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Seats reserved. Awaiting payment.',
      reservation_id: reservationId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reservation failed:', error);
    return res.status(409).json({
      error: error.message
    });
  } finally {
    client.release();
  }
};

const createPaymentIntent = async (req, res) => {
  const { reservationId } = req.body;

  if (!reservationId) {
    return res.status(400).json({
      error: 'Reservation ID is required.'
    });
  }

  try {
    const query = `
      SELECT id
      FROM reservations
      WHERE id = $1
      AND status = 'pending_payment';
    `;

    const { rows } = await db.query(query, [reservationId]);

    if (rows.length === 0) {
      return res.status(400).json({
        error: 'Reservation expired or unavailable.'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        reservation_id: reservationId
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Payment Intent creation failed:', error);
    return res.status(500).json({
      error: 'Payment system failure.'
    });
  }
};

module.exports = {
  createReservation,
  createPaymentIntent
};
