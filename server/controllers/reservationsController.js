const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const TICKET_CURRENCY = 'usd';

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
  const normalizedSeatIds = [];
  for (const seatId of seatIds) {
    const numSeatId = Number(seatId);
    if (isNaN(numSeatId) || numSeatId <= 0 || !Number.isInteger(numSeatId)) {
      return res.status(400).json({ error: 'Invalid seat ID format.' });
    }
    if (uniqueSeatIds.has(numSeatId)) {
      return res.status(400).json({ error: 'Duplicate seat IDs are not allowed.' });
    }
    uniqueSeatIds.add(numSeatId);
    normalizedSeatIds.push(numSeatId);
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Verify if the showtime exists
    const showtimeCheck = await client.query(
      `SELECT st.id,
              st.base_price_cents,
              st.currency,
              m.title AS movie_title,
              m.poster AS movie_poster,
              sc.name AS screen_name,
              st.start_time,
              st.end_time
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN screens sc ON sc.id = st.screen_id
       WHERE st.id = $1 AND st.is_archived = FALSE
       FOR UPDATE OF st`,
      [showtimeId]
    );

    if (showtimeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Showtime not found.'
      });
    }

    await validateShowtimeIsOpen(client, showtimeId);

    const lockQuery = `
      SELECT ss.seat_id,
             ss.status,
             ss.price_override_cents,
             s.category,
             s.surcharge_cents,
             s.row_letter || s.seat_number AS seat_label
      FROM showtime_seats ss
      JOIN seats s ON s.id = ss.seat_id
      WHERE ss.showtime_id = $1
      AND ss.seat_id = ANY($2)
      ORDER BY ss.seat_id
      FOR UPDATE OF ss, s;
    `;

    const { rows } = await client.query(lockQuery, [showtimeId, normalizedSeatIds]);

    if (rows.length !== normalizedSeatIds.length) {
      throw new Error('One or more seats are invalid.');
    }

    const isAvailable = rows.every((row) => row.status === 'available');

    if (!isAvailable) {
      throw new Error('One or more seats are no longer available.');
    }

    const showtime = showtimeCheck.rows[0];
    if (showtime.currency !== TICKET_CURRENCY) {
      throw new Error('This showtime uses an unsupported currency.');
    }
    const seatPrices = rows.map((row) => ({
      seatId: row.seat_id,
      label: row.seat_label,
      category: row.category,
      priceCents: row.price_override_cents ?? showtime.base_price_cents + row.surcharge_cents
    }));
    const totalAmount = seatPrices.reduce((total, seat) => total + seat.priceCents, 0);
    if (!Number.isSafeInteger(totalAmount) || totalAmount < 50 || totalAmount > 99999999) {
      throw new Error('The reservation total must be between $0.50 and $999,999.99 USD.');
    }

    let reservationRes;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const bookingReference = `MOV-${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
      reservationRes = await client.query(
        `INSERT INTO reservations (
           user_id, showtime_id, status, booking_reference, seat_labels,
           movie_title_snapshot, movie_poster_snapshot, screen_name_snapshot,
           showtime_start_snapshot, showtime_end_snapshot, amount, currency
         )
         VALUES ($1, $2, 'pending_payment', $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (booking_reference) DO NOTHING
         RETURNING id, booking_reference`,
        [
        userId,
        showtimeId,
        bookingReference,
        rows.map((row) => row.seat_label),
        showtimeCheck.rows[0].movie_title,
        showtimeCheck.rows[0].movie_poster,
        showtimeCheck.rows[0].screen_name,
        showtimeCheck.rows[0].start_time,
        showtimeCheck.rows[0].end_time,
        totalAmount,
        showtime.currency
        ]
      );
      if (reservationRes.rowCount === 1) {
        break;
      }
    }

    if (!reservationRes?.rowCount) {
      throw new Error('Unable to create a unique booking reference.');
    }

    const reservationId = reservationRes.rows[0].id;

    const held = await client.query(
      `UPDATE showtime_seats ss
       SET status = 'pending_payment',
           reservation_id = $1
       FROM seats s
       WHERE ss.showtime_id = $2
         AND ss.seat_id = ANY($3)
         AND s.id = ss.seat_id
         AND ss.status = 'available'
       RETURNING ss.seat_id`,
      [reservationId, showtimeId, normalizedSeatIds]
    );
    if (held.rowCount !== normalizedSeatIds.length) {
      throw new Error('One or more seats are no longer available.');
    }

    const seatSnapshots = await client.query(
      `INSERT INTO reservation_seats (reservation_id, seat_id, seat_label, category, price_cents)
       SELECT $1,
              s.id,
              s.row_letter || s.seat_number,
              s.category,
              COALESCE(ss.price_override_cents, $2 + s.surcharge_cents)
       FROM showtime_seats ss
       JOIN seats s ON s.id = ss.seat_id
       WHERE ss.reservation_id = $1 AND ss.status = 'pending_payment'
       RETURNING seat_id`,
      [reservationId, showtime.base_price_cents]
    );
    if (seatSnapshots.rowCount !== normalizedSeatIds.length) {
      throw new Error('Unable to save all seat price details.');
    }
    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Seats reserved. Awaiting payment.',
      reservation_id: reservationId,
      booking_reference: reservationRes.rows[0].booking_reference,
      seats: seatPrices,
      totalAmount,
      amount: totalAmount,
      currency: showtime.currency,
      status: 'pending_payment'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reservation failed:', error);

    // Return 400 for bad seat requests or 409 for conflicts/availability issues
    const status = error.message.includes('no longer available') ? 409
      : error.message.includes('are invalid') ? 400
        : error.message.includes('unsupported currency') ||
          error.message.includes('reservation total') ? 400
          : 500;
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

  const client = await db.pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const reservationResult = await client.query(
      `SELECT r.id, r.user_id, r.status, r.payment_intent_id, r.amount, r.currency,
              COALESCE(r.showtime_start_snapshot, st.start_time) AS start_time
       FROM reservations r
       JOIN showtimes st ON st.id = r.showtime_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [numReservationId]
    );

    if (reservationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const reservation = reservationResult.rows[0];

    if (reservation.user_id !== userId) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(403).json({
        error: 'Unauthorized access to this reservation.'
      });
    }

    if (reservation.status !== 'pending_payment') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        error: 'This reservation cannot be paid in its current status.'
      });
    }

    if (new Date(reservation.start_time) <= new Date()) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(400).json({
        error: 'This showtime has started. Payment is no longer allowed.'
      });
    }

    const seatsResult = await client.query(
      `SELECT seat_id
       FROM showtime_seats
       WHERE reservation_id = $1
         AND status = 'pending_payment'
       FOR UPDATE`,
      [numReservationId]
    );

    if (seatsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({
        error: 'This reservation no longer holds any seats.'
      });
    }

    const amount = reservation.amount;
    const currency = reservation.currency;
    if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== TICKET_CURRENCY) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({ error: 'This reservation has invalid payment pricing.' });
    }
    let paymentIntent;

    if (reservation.payment_intent_id) {
      paymentIntent = await stripe.paymentIntents.retrieve(
        reservation.payment_intent_id
      );

      const matchesReservation =
        paymentIntent.metadata?.reservation_id === String(numReservationId) &&
        paymentIntent.amount === amount &&
        paymentIntent.currency === currency;

      if (!matchesReservation) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({
          error: 'The existing payment attempt does not match this reservation.'
        });
      }

      if (paymentIntent.status === 'canceled') {
        paymentIntent = await stripe.paymentIntents.create(
          {
            amount,
            currency,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never'
            },
            metadata: {
              reservation_id: String(numReservationId)
            }
          },
          { idempotencyKey: `reservation-${numReservationId}-retry-${paymentIntent.id}` }
        );
      } else if (
        !['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(
          paymentIntent.status
        )
      ) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return res.status(409).json({
          error: 'Payment is already processing or has already completed.'
        });
      }
    } else {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            reservation_id: String(numReservationId)
          }
        },
        { idempotencyKey: `reservation-${numReservationId}-initial` }
      );
    }

    const updateResult = await client.query(
      `UPDATE reservations
       SET payment_intent_id = $1,
           payment_status = 'pending'
       WHERE id = $2
         AND user_id = $3
         AND status = 'pending_payment'
       RETURNING id`,
      [paymentIntent.id, numReservationId, userId]
    );

    if (updateResult.rows.length !== 1) {
      throw new Error('Reservation changed while payment was being prepared.');
    }

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reservationId: numReservationId,
      livemode: paymentIntent.livemode
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }

    console.error('Payment Intent creation failed:', {
      type: error.type,
      code: error.code,
      requestId: error.requestId
    });

    return res.status(500).json({ error: 'Payment system failure.' });
  } finally {
    client.release();
  }
};

const validateShowtimeIsOpen = async (client, showtimeId) => {
  const result = await client.query(
    `SELECT id, end_time <= NOW() AS has_ended
     FROM showtimes
     WHERE id = $1 AND is_archived = FALSE`,
    [showtimeId]
  );

  if (result.rows.length === 0) {
    throw new Error('Showtime not found.');
  }

  if (result.rows[0].has_ended) {
    throw new Error('This showtime has already ended. Booking is no longer available.');
  }
};

const getUserReservations = async (req, res) => {
  const userId = req.user.userId;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const query = `
      SELECT r.id,
             r.booking_reference,
             r.status,
             r.payment_status,
             r.created_at,
             r.amount,
             r.currency,
             CASE
               WHEN EXISTS (SELECT 1 FROM reservation_seats rs WHERE rs.reservation_id = r.id)
               THEN ARRAY(SELECT rs.seat_label
                          FROM reservation_seats rs
                          WHERE rs.reservation_id = r.id
                          ORDER BY rs.seat_label)
               ELSE r.seat_labels
             END AS seat_labels,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'label', rs.seat_label,
                 'category', rs.category,
                 'priceCents', rs.price_cents
               ) ORDER BY rs.seat_label)
                FROM reservation_seats rs
                WHERE rs.reservation_id = r.id),
               '[]'::json
             ) AS seat_details,
             COALESCE(r.movie_title_snapshot, m.title) AS movie_title,
             COALESCE(r.showtime_start_snapshot, st.start_time) AS start_time,
             COALESCE(r.screen_name_snapshot, sc.name) AS screen_name
      FROM reservations r
      LEFT JOIN showtimes st ON st.id = r.showtime_id
      LEFT JOIN movies m ON m.id = st.movie_id
      LEFT JOIN screens sc ON sc.id = st.screen_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC;
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
      SELECT r.id,
             r.booking_reference,
             r.status,
             r.payment_status,
             r.created_at,
             r.amount,
             r.currency,
             COALESCE(r.showtime_start_snapshot, st.start_time) AS start_time,
             COALESCE(r.showtime_end_snapshot, st.end_time) AS end_time,
             COALESCE(r.movie_title_snapshot, m.title) AS movie_name,
             COALESCE(r.screen_name_snapshot, sc.name) AS screen_name,
             m.duration_minutes,
             CASE
               WHEN EXISTS (SELECT 1 FROM reservation_seats rs WHERE rs.reservation_id = r.id)
               THEN ARRAY(SELECT rs.seat_label
                          FROM reservation_seats rs
                          WHERE rs.reservation_id = r.id
                          ORDER BY rs.seat_label)
               ELSE r.seat_labels
             END AS seats,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'label', rs.seat_label,
                 'category', rs.category,
                 'priceCents', rs.price_cents
               ) ORDER BY rs.seat_label)
                FROM reservation_seats rs
                WHERE rs.reservation_id = r.id),
               '[]'::json
             ) AS seat_details
      FROM reservations r
      LEFT JOIN showtimes st ON st.id = r.showtime_id
      LEFT JOIN movies m ON m.id = st.movie_id
      LEFT JOIN screens sc ON sc.id = st.screen_id
      WHERE r.id = $1 AND r.user_id = $2`;
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

const getOwnedReceipt = async (reservationId, userId) => {
  const { rows } = await db.query(
    `SELECT
       r.id,
       r.booking_reference,
       r.status,
       r.payment_status,
       r.created_at,
       r.amount,
       r.currency,
       r.paid_at,
       r.refunded_at,
       r.payment_intent_id,
       CASE
         WHEN EXISTS (SELECT 1 FROM reservation_seats rs WHERE rs.reservation_id = r.id)
         THEN ARRAY(SELECT rs.seat_label
                    FROM reservation_seats rs
                    WHERE rs.reservation_id = r.id
                    ORDER BY rs.seat_label)
         ELSE r.seat_labels
       END AS seat_labels,
       (SELECT json_agg(json_build_object(
          'label', rs.seat_label,
          'category', rs.category,
          'priceCents', rs.price_cents
        ) ORDER BY rs.seat_label)
        FROM reservation_seats rs
        WHERE rs.reservation_id = r.id) AS seat_details,
       COALESCE(r.movie_title_snapshot, m.title) AS movie_title,
       COALESCE(r.movie_poster_snapshot, m.poster) AS movie_poster,
       m.duration_minutes,
       COALESCE(r.screen_name_snapshot, s.name) AS screen_name,
       COALESCE(r.showtime_start_snapshot, st.start_time) AS start_time,
       COALESCE(r.showtime_end_snapshot, st.end_time) AS end_time
     FROM reservations r
     JOIN showtimes st ON st.id = r.showtime_id
     JOIN movies m ON m.id = st.movie_id
     JOIN screens s ON s.id = st.screen_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [reservationId, userId]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    bookingReference: row.booking_reference,
    status: row.status,
    bookingDate: row.created_at,
    movie: {
      title: row.movie_title,
      poster: row.movie_poster,
      durationMinutes: row.duration_minutes
    },
    screening: {
      screenName: row.screen_name,
      startTime: row.start_time,
      endTime: row.end_time
    },
    seats: row.seat_labels || [],
    seatDetails: row.seat_details || [],
    payment: {
      status: row.payment_status,
      amount: row.amount,
      currency: row.currency,
      paidAt: row.paid_at,
      refundedAt: row.refunded_at,
      transactionReference: row.payment_intent_id
    }
  };
};

const validateReceiptRequest = (req, res) => {
  const reservationId = req.params.id;
  if (!/^[1-9]\d*$/.test(reservationId)) {
    res.status(400).json({ error: 'Invalid reservation ID format.' });
    return null;
  }

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }

  return { reservationId, userId };
};

const getReservationReceipt = async (req, res) => {
  const request = validateReceiptRequest(req, res);
  if (!request) return;

  try {
    const receipt = await getOwnedReceipt(request.reservationId, request.userId);
    if (!receipt) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    return res.status(200).json({ receipt });
  } catch (error) {
    console.error('Failed to fetch reservation receipt:', error);
    return res.status(500).json({ error: 'Failed to fetch receipt.' });
  }
};

const createReceiptPdf = (receipt) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 52 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('error', reject);
  doc.on('end', () => resolve(Buffer.concat(chunks)));

  const left = 52;
  const width = 491;
  const dateText = (value) => value
    ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not recorded';
  const statusText = (value) => (value || 'unknown').replace(/_/g, ' ');

  doc.fillColor('#e50914').fontSize(10).text('REELHOUSE CINEMA', left, 54, { characterSpacing: 1.4 });
  doc.fillColor('#171720').fontSize(25).font('Helvetica-Bold').text('MOVIE BOOKING RECEIPT', left, 82, { width });
  doc.fillColor('#666674').fontSize(10).font('Helvetica').text('Keep this receipt for your booking details.', left, 116);

  doc.roundedRect(left, 145, width, 70, 8).fill('#171720');
  doc.fillColor('#b8b8c4').fontSize(9).text('BOOKING REFERENCE', left + 18, 160);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text(receipt.bookingReference, left + 18, 178);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text(
    `${statusText(receipt.status).toUpperCase()}  ·  PAYMENT ${statusText(receipt.payment.status).toUpperCase()}`,
    left + 240,
    178,
    { width: 230, align: 'right' }
  );

  let y = 242;
  const section = (title) => {
    doc.fillColor('#e50914').fontSize(9).font('Helvetica-Bold').text(title.toUpperCase(), left, y);
    y += 18;
  };
  const field = (label, value) => {
    doc.fillColor('#777783').fontSize(9).font('Helvetica').text(label, left, y, { width: 130 });
    doc.fillColor('#171720').fontSize(11).font('Helvetica-Bold').text(String(value || 'Not available'), left + 135, y, { width: width - 135 });
    y += Math.max(19, doc.heightOfString(String(value || 'Not available'), { width: width - 135, fontSize: 11 }) + 8);
  };

  section('Movie');
  field('Title', receipt.movie.title);
  field('Screen', receipt.screening.screenName);
  field('Showtime', dateText(receipt.screening.startTime));
  field('Ends', dateText(receipt.screening.endTime));
  const pricedSeats = receipt.seatDetails.map((seat) =>
    `${seat.label} (${statusText(seat.category)}): ${Number.isInteger(seat.priceCents) && receipt.payment.currency
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.payment.currency.toUpperCase() }).format(seat.priceCents / 100)
      : 'price unavailable'}`
  );
  field('Seats', pricedSeats.length ? pricedSeats.join(', ') : receipt.seats.join(', ') || 'Seat details unavailable');
  y += 8;

  section('Payment');
  const amountWasCharged = ['paid', 'refund_pending', 'refund_failed', 'refunded'].includes(receipt.payment.status);
  const amount = Number.isInteger(receipt.payment.amount) && receipt.payment.currency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.payment.currency.toUpperCase() })
      .format(receipt.payment.amount / 100)
    : 'Amount not recorded';
  field(amountWasCharged ? 'Amount charged' : 'Payment amount', amount);
  field('Payment status', statusText(receipt.payment.status));
  field('Paid at', dateText(receipt.payment.paidAt));
  if (receipt.payment.refundedAt) field('Refunded at', dateText(receipt.payment.refundedAt));
  field('Transaction', receipt.payment.transactionReference);
  field('Booked at', dateText(receipt.bookingDate));

  const showtimeIsUpcoming = new Date(receipt.screening.startTime) > new Date();
  if (receipt.status !== 'confirmed' || receipt.payment.status !== 'paid' || !showtimeIsUpcoming) {
    y += 12;
    doc.fillColor('#a33').fontSize(10).font('Helvetica-Bold')
      .text('This booking is not currently a valid paid ticket.', left, y, { width });
  }
  doc.end();
});

const downloadReservationReceipt = async (req, res) => {
  const request = validateReceiptRequest(req, res);
  if (!request) return;

  try {
    const receipt = await getOwnedReceipt(request.reservationId, request.userId);
    if (!receipt) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    const pdf = await createReceiptPdf(receipt);
    const safeReference = receipt.bookingReference.replace(/[^A-Z0-9-]/g, '');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${safeReference}.pdf"`,
      'Content-Length': pdf.length
    });
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('Failed to generate reservation receipt PDF:', error);
    return res.status(500).json({ error: 'Failed to generate receipt PDF.' });
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
  getReservationReceipt,
  downloadReservationReceipt,
  cancelReservation
};