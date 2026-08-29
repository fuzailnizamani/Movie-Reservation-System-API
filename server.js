const express = require('express');
const db = require('./db');

require('./worker');

const app = express();
app.use(express.json());

// Test route to verify the connection
app.get('/movies', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM movies');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/showtimes/:id/seats', async (req, res) => {
  const showtimeId = req.params.id;

  try {
    const query = `
      SELECT 
        s.id AS seat_id,
        s.row_letter,
        s.seat_number,
        ss.status
      FROM showtime_seats ss
      JOIN seats s ON ss.seat_id = s.id
      WHERE ss.showtime_id = $1
      ORDER BY s.row_letter, s.seat_number;
    `;

    const { rows } = await db.query(query, [showtimeId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Showtime inventory not found.' });
    }

    res.status(200).json({
      showtime_id: showtimeId,
      inventory: rows
    });

  } catch (error) {
    console.error('Inventory extraction failed:', error);
    res.status(500).json({ error: 'System failure.' });
  }
});

app.post('/reservations', async (req, res) => {
  const { userId, showtimeId, seatIds } = req.body;

  if (!seatIds || seatIds.length === 0) {
    return res.status(400).json({
      error: 'No seats selected.'
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the requested seats
    const lockQuery = `
      SELECT seat_id, status
      FROM showtime_seats
      WHERE showtime_id = $1
      AND seat_id = ANY($2)
      FOR UPDATE;
    `;

    const { rows } = await client.query(
      lockQuery,
      [showtimeId, seatIds]
    );

    // 2. Make sure all requested seats exist
    if (rows.length !== seatIds.length) {
      throw new Error('One or more seats are invalid.');
    }

    // 3. Make sure all seats are available
    const isAvailable = rows.every(
      row => row.status === 'available'
    );

    if (!isAvailable) {
      throw new Error(
        'One or more seats are no longer available.'
      );
    }

    // 4. Create the reservation
    const insertQuery = `
      INSERT INTO reservations (user_id, showtime_id, status)
      VALUES ($1, $2, 'pending_payment')
      RETURNING id;
    `;

    const reservationRes = await client.query(
      insertQuery,
      [userId, showtimeId]
    );

    const reservationId = reservationRes.rows[0].id;

    // 5. Connect the seats to the reservation
    const updateQuery = `
      UPDATE showtime_seats
      SET
        status = 'pending_payment',
        reservation_id = $1
      WHERE showtime_id = $2
      AND seat_id = ANY($3);
    `;

    await client.query(
      updateQuery,
      [reservationId, showtimeId, seatIds]
    );

    // 6. Save everything
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Seats reserved. Awaiting payment.',
      reservation_id: reservationId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reservation failed:', error);
    res.status(409).json({
      error: error.message
    });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});