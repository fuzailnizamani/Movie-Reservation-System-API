const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createReservation = async (req, res) => {
  const { showtimeId, seatIds } = req.body;
  const userId = req.user.userId;

  if (!showtimeId) {
    return res.status(400).json({ error: 'Showtime ID is required.' });
  }

  const numShowtimeId = Number(showtimeId);
  if (isNaN(numShowtimeId) || numShowtimeId <= 0 || !Number.isInteger(numShowtimeId)) {
    return res.status(400).json({ error: 'Invalid showtime ID format.' });
  }

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({
      error: 'No seats selected.'
    });
  }

  // Validate seat ID formats and check for duplicate seat IDs in the request
  const uniqueSeatIds = new Set();
  for (const seatId of seatIds) {
    const numSeatId = Number(seatId);
    if (isNaN(numSeatId) || numSeatId <= 0 || !Number.isInteger(numSeatId)) {
      return res.status(400).json({ error: 'Invalid seat ID format.' });
    }
    if (uniqueSeatIds.has(numSeatId)) {
      return res.status(400).json({ error: 'Duplicate seat IDs are not allowed.' });
    }
    uniqueSeatIds.add(numSeatId);
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verify if the showtime exists
    const showtimeCheck = await client.query(
      `SELECT id FROM showtimes WHERE id = $1`,
      [showtimeId]
    );

    if (showtimeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Showtime not found.'
      });
    }

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
    
    // Return 400 for bad seat requests or 409 for conflicts/availability issues
    const status = error.message.includes('seats are') ? 409 : 500;
    return res.status(status).json({
      error: error.message
    });
  } finally {
    client.release();
  }
};

const createPaymentIntent = async (req, res) => {
  const rawReservationId = req.body.reservationId || req.body.reservation_id;
  const userId = req.user?.userId;

  if (rawReservationId === undefined || rawReservationId === null || rawReservationId === '') {
    return res.status(400).json({
      error: 'Reservation ID is required.'
    });
  }

  const numReservationId = Number(rawReservationId);
  if (isNaN(numReservationId) || numReservationId <= 0 || !Number.isInteger(numReservationId)) {
    return res.status(400).json({
      error: 'Invalid reservation ID format.'
    });
  }

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  try {
    const existenceCheck = await db.query(
      `SELECT id, user_id, status FROM reservations WHERE id = $1`,
      [numReservationId]
    );

    if (existenceCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Reservation not found.'
      });
    }

    const reservation = existenceCheck.rows[0];

    if (reservation.user_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized access to this reservation.'
      });
    }

    if (reservation.status !== 'pending_payment') {
      return res.status(400).json({
        error: 'This reservation cannot be paid in its current status.'
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
        reservation_id: numReservationId.toString()
      }
    });

    await db.query(
      `
        UPDATE reservations
        SET payment_intent_id = $1
        WHERE id = $2
          AND user_id = $3
          AND status = 'pending_payment'
      `,
      [paymentIntent.id, numReservationId, userId]
    );

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId: numReservationId
    });
  } catch (error) {
    console.error('Payment Intent creation failed:', error);
    return res.status(500).json({
      error: 'Payment system failure.'
    });
  }
};

const getUserReservations = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const query = `
      SELECT * from reservations
      where user_id = $1
      order by created_at desc;
    `;

    const { rows } = await db.query(query, [userId]);
    return res.status(200).json({ reservations: rows });

  } catch (error) {
    console.error('Failed to fetch user reservations:', error);
    return res.status(500).json({ error: 'Failed to fetch reservations.' });
  }
};

const getUserReservationById = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  const reservationId = req.params.id;
  if (!reservationId || isNaN(Number(reservationId)) || Number(reservationId) <= 0) {
    return res.status(400).json({ error: 'Invalid reservation ID format.' });
  }
  try {

    // Check if the reservation exists in the database
    const reservationCheck = await db.query(
      `SELECT id, user_id FROM reservations WHERE id = $1`,
      [reservationId]
    );

    if (reservationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation does not exist.' });
    }

    // Verify ownership
    if (reservationCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this reservation.' });
    }

    const query = `
      SELECT 
      reservations.id,
      reservations.status,
      reservations.created_at,
      to_char(showtimes.start_time, 'HH12:MI AM') AS start_time,
      to_char(showtimes.end_time, 'HH12:MI AM') AS end_time,
      movies.title AS movie_name,
      movies.duration_minutes,
      json_agg(
              seats.row_letter || seats.seat_number
          ) FILTER (WHERE seats.id IS NOT NULL) AS seats
      FROM reservations

      LEFT JOIN showtimes 
      ON reservations.showtime_id = showtimes.id

      LEFT JOIN movies 
      ON showtimes.movie_id = movies.id

      LEFT JOIN showtime_seats 
      ON reservations.id = showtime_seats.reservation_id

      LEFT JOIN seats 
      ON showtime_seats.seat_id = seats.id

      WHERE reservations.id = $1 AND user_id = $2
      GROUP BY    
        reservations.id,
          reservations.status,
          reservations.created_at,
          showtimes.start_time,
          showtimes.end_time,
          movies.title,
          movies.duration_minutes
      `;
    const { rows } = await db.query(query, [reservationId, userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    return res.status(200).json({ reservation: rows[0] });
  } catch (error) {
    console.error('Failed to fetch reservation by ID:', error);
    return res.status(500).json({ error: 'Failed to fetch reservation.' });
  }
};

const cancelReservation = async (req, res) => {
  const userId = req.user?.userId;
  const reservationId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  if (!reservationId) {
    return res.status(400).json({ error: 'Reservation ID is required.' });
  }

  // Validate if reservationId is a valid positive integer ID
  if (isNaN(Number(reservationId)) || Number(reservationId) <= 0) {
    return res.status(400).json({ error: 'Invalid reservation ID format.' });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const reservationResult = await client.query(
      `
        SELECT id, user_id, status
        FROM reservations
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [reservationId, userId]
    );

    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = reservationResult.rows[0];
    const cancellableStatuses = ['pending_payment', 'confirmed', 'paid'];

    if (reservation.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reservation is already cancelled.' });
    }

    if (reservation.status === 'expired') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reservation has already expired and cannot be cancelled.' });
    }

    if (!cancellableStatuses.includes(reservation.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'This reservation cannot be cancelled in its current status.'
      });
    }

    await client.query(
      `
        UPDATE showtime_seats
        SET status = 'available',
            reservation_id = NULL
        WHERE reservation_id = $1
      `,
      [reservation.id]
    );

    await client.query(
      `
        UPDATE reservations
        SET status = 'cancelled'
        WHERE id = $1
      `,
      [reservation.id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Reservation cancelled successfully.',
      reservation_id: reservation.id,
      status: 'cancelled',
      refund_processed: false,
      note: 'This version only releases the seats and marks the reservation as cancelled. No refund is processed.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel reservation failed:', error);
    return res.status(500).json({ error: 'Failed to cancel reservation.' });
  } finally {
    client.release();
  }
};

module.exports = {
  createReservation,
  createPaymentIntent,
  getUserReservations,
  getUserReservationById,
  cancelReservation
};