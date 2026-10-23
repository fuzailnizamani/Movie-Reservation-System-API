const db = require('../db');
const MAX_PRICE_CENTS = 99999999;

const parsePriceCents = (value, defaultValue) => {
    const price = value === undefined ? defaultValue : value;
    if (!Number.isSafeInteger(price) || price < 0 || price > MAX_PRICE_CENTS) return null;
    return price;
};

// GET SHOWTIME SEATS
// GET /showtimes/:id/seats
const showtimesIdSeatsController = async (req, res) => {
    const showtimeId = req.params.id;
    try {
        if (!Number.isInteger(Number(showtimeId)) || Number(showtimeId) <= 0) {
            return res.status(400).json({
                error: 'Invalid showtime ID.'
            });
        }
        const showtimeResult = await db.query(
            `SELECT id, base_price_cents, currency
             FROM showtimes
             WHERE id = $1 AND is_archived = FALSE`,
            [showtimeId]
        );
        if (showtimeResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        const query = `
            SELECT
                s.id AS seat_id,
                s.row_letter,
                s.seat_number,
                ss.status,
                s.category,
                s.surcharge_cents,
                ss.price_override_cents,
                COALESCE(ss.price_override_cents, st.base_price_cents + s.surcharge_cents) AS price_cents,
                st.currency
            FROM showtime_seats ss
            JOIN seats s
                ON ss.seat_id = s.id
            JOIN showtimes st
                ON st.id = ss.showtime_id
            WHERE ss.showtime_id = $1 AND st.is_archived = FALSE
            ORDER BY s.row_letter, s.seat_number;
        `;
        const { rows } = await db.query(query, [showtimeId]);
        return res.status(200).json({
            showtime_id: showtimeId,
            inventory: rows
        });
    } catch (error) {
        console.error('Inventory extraction failed:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};
// CREATE SHOWTIME
// POST /showtimes
const createShowtime = async (req, res) => {
    const client = await db.pool.connect();
    let transactionStarted = false;
    try {
        const {
            movieId,
            screenId,
            startTime,
            endTime,
            basePriceCents
        } = req.body;
        const priceCents = parsePriceCents(basePriceCents, 1000);
        if (priceCents === null) {
            return res.status(400).json({ error: 'basePriceCents must be a non-negative integer no greater than 99999999.' });
        }
        if (!movieId || !screenId || !startTime || !endTime) {
            return res.status(400).json({
                message: 'movieId, screenId, startTime and endTime are required'
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                message: 'Invalid startTime or endTime'
            });
        }
        if (end <= start) {
            return res.status(400).json({
                message: 'endTime must be after startTime'
            });
        }
        await client.query('BEGIN');
        transactionStarted = true;

        // Check movie exists and is not archived
        const movieResult = await client.query(
            `SELECT id, title
             FROM movies
             WHERE id = $1
             AND is_archived = FALSE`,
            [movieId]
        );
        if (movieResult.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({
                message: 'Movie not found or is archived'
            });
        }
        // Serialize scheduling with screen archival.
        const screenResult = await client.query(
            `SELECT id, name, is_archived
             FROM screens
             WHERE id = $1
             FOR UPDATE`,
            [screenId]
        );
        if (screenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({
                message: 'Screen not found'
            });
        }
        if (screenResult.rows[0].is_archived) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({
                message: 'Cannot schedule a showtime on an archived screen.'
            });
        }
        // Check screen has seats
        const seatsResult = await client.query(
            `SELECT id
             FROM seats
             WHERE screen_id = $1
             LIMIT 1`,
            [screenId]
        );
        if (seatsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({
                message: 'This screen has no seats'
            });
        }
        // Check for overlapping showtime on same screen
        const conflictResult = await client.query(
            `SELECT id
             FROM showtimes
             WHERE screen_id = $1
             AND is_archived = FALSE
             AND start_time < $3
             AND end_time > $2
             LIMIT 1`,
            [screenId, startTime, endTime]
        );
        if (conflictResult.rows.length > 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({
                message: 'This screen already has a showtime during this period'
            });
        }
        // Create showtime
        const showtimeResult = await client.query(
            `INSERT INTO showtimes
                (movie_id, screen_id, start_time, end_time, base_price_cents, currency)
             VALUES
                ($1, $2, $3, $4, $5, 'usd')
             RETURNING *`,
            [movieId, screenId, startTime, endTime, priceCents]
        );
        const showtime = showtimeResult.rows[0];
        // Create seat inventory for this showtime
        await client.query(
            `INSERT INTO showtime_seats (showtime_id, seat_id)
             SELECT $1, id
             FROM seats
             WHERE screen_id = $2`,
            [showtime.id, screenId]
        );
        await client.query('COMMIT');
        return res.status(201).json({
            message: 'Showtime created successfully',
            showtime
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
};
// GET ALL SHOWTIMES
// GET /showtimes
const getShowtimes = async (req, res) => {
    try {
        const {
            movieId,
            date,
            screenId
        } = req.query;

        if (movieId) {
            const numMovieId = Number(movieId);
            if (isNaN(numMovieId) || numMovieId <= 0 || !Number.isInteger(numMovieId)) {
                return res.status(400).json({
                    message: 'Invalid movie ID.'
                });
            }

            const movieCheck = await db.query(
                `SELECT id FROM movies WHERE id = $1`,
                [movieId]
            );
            if (movieCheck.rows.length === 0) {
                return res.status(404).json({
                    message: 'Movie does not exist'
                });
            }
        }

        if (screenId) {
            const numScreenId = Number(screenId);
            if (isNaN(numScreenId) || numScreenId <= 0 || !Number.isInteger(numScreenId)) {
                return res.status(400).json({
                    message: 'Invalid screen ID.'
                });
            }

            const screenCheck = await db.query(
                `SELECT id FROM screens WHERE id = $1`,
                [screenId]
            );
            if (screenCheck.rows.length === 0) {
                return res.status(404).json({
                    message: 'Screen does not exist'
                });
            }
        }

        if (date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date) || isNaN(Date.parse(date))) {
                return res.status(400).json({
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
            }
        }
        
        const values = [];
        const conditions = ['st.is_archived = FALSE'];
        if (movieId) {
            values.push(movieId);
            conditions.push(`st.movie_id = $${values.length}`);
        }
        if (screenId) {
            values.push(screenId);
            conditions.push(`st.screen_id = $${values.length}`);
        }
        if (date) {
            values.push(date);
            conditions.push(`
                (st.start_time AT TIME ZONE 'Asia/Karachi') >= $${values.length}::date
                AND (st.start_time AT TIME ZONE 'Asia/Karachi') < ($${values.length}::date + INTERVAL '1 day')
            `);
        }
        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
        const query = `
            SELECT
                st.id,
                st.movie_id,
                m.title AS movie_title,
                st.screen_id,
                s.name AS screen_name,
                st.start_time,
                st.end_time,
                st.base_price_cents,
                st.currency
            FROM showtimes st
            JOIN movies m
                ON st.movie_id = m.id
            JOIN screens s
                ON st.screen_id = s.id
            ${whereClause}
            ORDER BY st.start_time;
        `;
        const { rows } = await db.query(query, values);
        return res.status(200).json({
            showtimes: rows
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};
// GET ONE SHOWTIME
// GET /showtimes/:id
const getShowtimeById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                error: 'Invalid showtime ID.'
            });
        }
        const { rows } = await db.query(
            `SELECT
                st.id,
                st.movie_id,
                m.title AS movie_title,
                st.screen_id,
                s.name AS screen_name,
                st.start_time,
                st.end_time,
                st.base_price_cents,
                st.currency
             FROM showtimes st
             JOIN movies m
                 ON st.movie_id = m.id
             JOIN screens s
                 ON st.screen_id = s.id
             WHERE st.id = $1 AND st.is_archived = FALSE`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        return res.status(200).json({
            showtime: rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

const updateShowtimeSeatPrice = async (req, res) => {
    const { id, seatId } = req.params;
    const rawOverride = req.body.priceOverrideCents;
    if (!/^[1-9]\d*$/.test(id) || !/^[1-9]\d*$/.test(seatId)) {
        return res.status(400).json({ error: 'Invalid showtime or seat ID.' });
    }
    if (
        rawOverride !== null &&
        (!Number.isSafeInteger(rawOverride) || rawOverride < 0 || rawOverride > MAX_PRICE_CENTS)
    ) {
        return res.status(400).json({
            error: 'priceOverrideCents must be null or a non-negative integer no greater than 99999999.'
        });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `SELECT ss.status
             FROM showtime_seats ss
             JOIN showtimes st ON st.id = ss.showtime_id
             WHERE ss.showtime_id = $1 AND ss.seat_id = $2
               AND st.is_archived = FALSE
             FOR UPDATE`,
            [id, seatId]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Seat was not found for this showtime.' });
        }
        if (result.rows[0].status === 'pending_payment') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Seat pricing cannot change while the seat is held for payment.' });
        }

        const updated = await client.query(
            `UPDATE showtime_seats
             SET price_override_cents = $1
             WHERE showtime_id = $2 AND seat_id = $3
             RETURNING price_override_cents`,
            [rawOverride, id, seatId]
        );
        await client.query('COMMIT');
        return res.json({
            showtimeId: Number(id),
            seatId: Number(seatId),
            priceOverrideCents: updated.rows[0].price_override_cents
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to update showtime seat price:', error);
        return res.status(500).json({ error: 'Failed to update seat price.' });
    } finally {
        client.release();
    }
};

// UPDATE SHOWTIME
// PATCH /showtimes/:id
const updateShowtime = async (req, res) => {
    const client = await db.pool.connect();
    let transactionStarted = false;
    try {
        const { id } = req.params;
        const {
            movieId,
            screenId,
            startTime,
            endTime,
            basePriceCents
        } = req.body;
        // Check showtime exists
        const existingResult = await db.query(
            `SELECT *
             FROM showtimes
             WHERE id = $1 AND is_archived = FALSE`,
            [id]
        );
        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        const existing = existingResult.rows[0];
        const newPriceCents = parsePriceCents(basePriceCents, existing.base_price_cents);
        if (newPriceCents === null) {
            return res.status(400).json({ error: 'basePriceCents must be a non-negative integer no greater than 99999999.' });
        }
        const newMovieId =
            movieId !== undefined ? movieId : existing.movie_id;
        const newScreenId =
            screenId !== undefined ? screenId : existing.screen_id;
        const newStartTime =
            startTime !== undefined ? startTime : existing.start_time;
        const newEndTime =
            endTime !== undefined ? endTime : existing.end_time;
        const start = new Date(newStartTime);
        const end = new Date(newEndTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                message: 'Invalid startTime or endTime'
            });
        }
        if (end <= start) {
            return res.status(400).json({
                message: 'endTime must be after startTime'
            });
        }
        // Check movie exists and is not archived
        const movieResult = await db.query(
            `SELECT id
             FROM movies
             WHERE id = $1
             AND is_archived = FALSE`,
            [newMovieId]
        );
        if (movieResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Movie not found or is archived'
            });
        }
        // Check screen exists
        const screenResult = await db.query(
            `SELECT id
             FROM screens
             WHERE id = $1`,
            [newScreenId]
        );
        if (screenResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Screen not found'
            });
        }
        // Check screen has seats
        const seatsResult = await db.query(
            `SELECT id
             FROM seats
             WHERE screen_id = $1
             LIMIT 1`,
            [newScreenId]
        );
        if (seatsResult.rows.length === 0) {
            return res.status(400).json({
                message: 'This screen has no seats'
            });
        }
        // Check for screen schedule conflict
        const conflictResult = await db.query(
            `SELECT id
             FROM showtimes
             WHERE screen_id = $1
             AND id != $2
             AND is_archived = FALSE
             AND start_time < $4
             AND end_time > $3
             LIMIT 1`,
            [
                newScreenId,
                id,
                newStartTime,
                newEndTime
            ]
        );
        if (conflictResult.rows.length > 0) {
            return res.status(409).json({
                message: 'This screen already has a showtime during this period'
            });
        }
        /*
         * If the screen changes, the showtime must use
         * the new screen's seats.
         */
        const screenChanged =
            Number(newScreenId) !== Number(existing.screen_id);
        /*
         * If reservations already exist, don't allow changing
         * the showtime because it could affect existing bookings.
         */
        const reservationResult = await db.query(
            `SELECT id
             FROM reservations
             WHERE showtime_id = $1
             LIMIT 1`,
            [id]
        );
        const scheduleChanged =
            Number(newMovieId) !== Number(existing.movie_id) ||
            Number(newScreenId) !== Number(existing.screen_id) ||
            new Date(newStartTime).getTime() !== new Date(existing.start_time).getTime() ||
            new Date(newEndTime).getTime() !== new Date(existing.end_time).getTime();
        if (reservationResult.rows.length > 0 && scheduleChanged) {
            return res.status(409).json({
                message: 'Showtime schedule cannot be changed because it has reservations'
            });
        }
        await client.query('BEGIN');
        transactionStarted = true;
        const lockedScreen = await client.query(
            `SELECT id, is_archived
             FROM screens
             WHERE id = $1
             FOR UPDATE`,
            [newScreenId]
        );
        if (lockedScreen.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({ message: 'Screen not found' });
        }
        if (lockedScreen.rows[0].is_archived) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({
                message: 'Cannot schedule a showtime on an archived screen.'
            });
        }
        const lockedConflictResult = await client.query(
            `SELECT id
             FROM showtimes
             WHERE screen_id = $1
             AND id != $2
             AND is_archived = FALSE
             AND start_time < $4
             AND end_time > $3
             LIMIT 1`,
            [newScreenId, id, newStartTime, newEndTime]
        );
        if (lockedConflictResult.rows.length > 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({
                message: 'This screen already has a showtime during this period'
            });
        }
        const lockedShowtime = await client.query(
            `SELECT * FROM showtimes WHERE id = $1 FOR UPDATE`,
            [id]
        );
        if (lockedShowtime.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(404).json({ message: 'Showtime not found' });
        }
        const current = lockedShowtime.rows[0];
        const scheduleChangedAfterLock =
            Number(newMovieId) !== Number(current.movie_id) ||
            Number(newScreenId) !== Number(current.screen_id) ||
            new Date(newStartTime).getTime() !== new Date(current.start_time).getTime() ||
            new Date(newEndTime).getTime() !== new Date(current.end_time).getTime();
        if (scheduleChangedAfterLock) {
            const reservations = await client.query(
                `SELECT 1 FROM reservations WHERE showtime_id = $1 LIMIT 1`,
                [id]
            );
            if (reservations.rows.length > 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;
                return res.status(409).json({ message: 'Showtime schedule cannot be changed because it has reservations' });
            }
        }
        const priceForUpdate = basePriceCents === undefined ? current.base_price_cents : newPriceCents;
        if (priceForUpdate !== current.base_price_cents) {
            const pending = await client.query(
                `SELECT 1 FROM reservations
                 WHERE showtime_id = $1 AND status = 'pending_payment'
                 LIMIT 1`,
                [id]
            );
            if (pending.rows.length > 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;
                return res.status(409).json({ error: 'Showtime price cannot change while reservations are awaiting payment.' });
            }
        }
        // Update showtime
        const { rows } = await client.query(
            `UPDATE showtimes
             SET
                 movie_id = $1,
                 screen_id = $2,
                 start_time = $3,
                 end_time = $4,
                 base_price_cents = $5
             WHERE id = $6
             RETURNING *`,
            [
                newMovieId,
                newScreenId,
                newStartTime,
                newEndTime,
                priceForUpdate,
                id
            ]
        );
        // If screen changed, rebuild seat inventory
        if (screenChanged) {
            await client.query(
                `DELETE FROM showtime_seats
                 WHERE showtime_id = $1`,
                [id]
            );
            await client.query(
                `INSERT INTO showtime_seats (showtime_id, seat_id)
                 SELECT $1, id
                 FROM seats
                 WHERE screen_id = $2`,
                [id, newScreenId]
            );
        }
        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Showtime updated successfully',
            showtime: rows[0]
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
};
// DELETE SHOWTIME
// DELETE /showtimes/:id
const deleteShowtime = async (req, res) => {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({ message: 'Invalid showtime ID.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const showtimeResult = await client.query(
            `SELECT id, is_archived, start_time, end_time,
                    start_time <= NOW() AND end_time > NOW() AS is_running,
                    end_time <= NOW() AS is_completed
             FROM showtimes
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );
        if (showtimeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        const showtime = showtimeResult.rows[0];
        if (showtime.is_archived) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Showtime not found' });
        }

        const reservationResult = await client.query(
            `SELECT
                COUNT(*)::integer AS total,
                COUNT(*) FILTER (WHERE status = 'pending_payment')::integer AS pending,
                COUNT(*) FILTER (WHERE status IN ('confirmed', 'paid'))::integer AS confirmed
             FROM reservations
             WHERE showtime_id = $1`,
            [id]
        );
        const reservationCounts = reservationResult.rows[0];

        if (showtime.is_running) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                message: 'A showtime cannot be deleted while it is in progress.'
            });
        }

        if (!showtime.is_completed) {
            if (reservationCounts.pending > 0 || reservationCounts.confirmed > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    message: 'This upcoming showtime has active reservations or pending payments and cannot be deleted.'
                });
            }
        } else if (reservationCounts.pending > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                message: 'This completed showtime still has pending payments. Resolve or expire them before removing it.'
            });
        }

        if (reservationCounts.total > 0) {
            await client.query(
                `UPDATE showtimes
                 SET is_archived = TRUE
                 WHERE id = $1`,
                [id]
            );
            await client.query('COMMIT');
            return res.status(200).json({
                message: 'Showtime archived. Reservation, receipt, and payment history were preserved.',
                archived: true
            });
        }

        await client.query(`DELETE FROM showtimes WHERE id = $1`, [id]);
        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Showtime deleted successfully.',
            archived: false
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
};
module.exports = {
    showtimesIdSeatsController,
    createShowtime,
    getShowtimes,
    getShowtimeById,
    updateShowtimeSeatPrice,
    updateShowtime,
    deleteShowtime

};