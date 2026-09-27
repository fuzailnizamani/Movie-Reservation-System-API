const db = require('../db');
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
            `SELECT id
             FROM showtimes
             WHERE id = $1`,
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
                ss.status
            FROM showtime_seats ss
            JOIN seats s
                ON ss.seat_id = s.id
            WHERE ss.showtime_id = $1
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
            endTime
        } = req.body;
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
        // Check movie exists and is not archived
        const movieResult = await db.query(
            `SELECT id, title
             FROM movies
             WHERE id = $1
             AND is_archived = FALSE`,
            [movieId]
        );
        if (movieResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Movie not found or is archived'
            });
        }
        // Check screen exists
        const screenResult = await db.query(
            `SELECT id, name
             FROM screens
             WHERE id = $1`,
            [screenId]
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
            [screenId]
        );
        if (seatsResult.rows.length === 0) {
            return res.status(400).json({
                message: 'This screen has no seats'
            });
        }
        // Check for overlapping showtime on same screen
        const conflictResult = await db.query(
            `SELECT id
             FROM showtimes
             WHERE screen_id = $1
             AND start_time < $3
             AND end_time > $2
             LIMIT 1`,
            [screenId, startTime, endTime]
        );
        if (conflictResult.rows.length > 0) {
            return res.status(409).json({
                message: 'This screen already has a showtime during this period'
            });
        }
        await client.query('BEGIN');
        transactionStarted = true;
        // Create showtime
        const showtimeResult = await client.query(
            `INSERT INTO showtimes
                (movie_id, screen_id, start_time, end_time)
             VALUES
                ($1, $2, $3, $4)
             RETURNING *`,
            [movieId, screenId, startTime, endTime]
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
        const conditions = [];
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
                st.start_time >= $${values.length}::date
                AND st.start_time < ($${values.length}::date + INTERVAL '1 day')
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
                st.end_time
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
                st.end_time
             FROM showtimes st
             JOIN movies m
                 ON st.movie_id = m.id
             JOIN screens s
                 ON st.screen_id = s.id
             WHERE st.id = $1`,
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
            endTime
        } = req.body;
        // Check showtime exists
        const existingResult = await db.query(
            `SELECT *
             FROM showtimes
             WHERE id = $1`,
            [id]
        );
        if (existingResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        const existing = existingResult.rows[0];
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
        if (reservationResult.rows.length > 0) {
            return res.status(409).json({
                message: 'Showtime cannot be updated because it has reservations'
            });
        }
        await client.query('BEGIN');
        transactionStarted = true;
        // Update showtime
        const { rows } = await client.query(
            `UPDATE showtimes
             SET
                 movie_id = $1,
                 screen_id = $2,
                 start_time = $3,
                 end_time = $4
             WHERE id = $5
             RETURNING *`,
            [
                newMovieId,
                newScreenId,
                newStartTime,
                newEndTime,
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
    const client = await db.pool.connect();
    let transactionStarted = false;
    try {
        const { id } = req.params;
        // Check showtime exists
        const showtimeResult = await client.query(
            `SELECT id
             FROM showtimes
             WHERE id = $1`,
            [id]
        );
        if (showtimeResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Showtime not found'
            });
        }
        // Do not delete showtime that has reservations
        const reservationResult = await client.query(
            `SELECT id
             FROM reservations
             WHERE showtime_id = $1
             LIMIT 1`,
            [id]
        );
        if (reservationResult.rows.length > 0) {
            return res.status(409).json({
                message: 'Showtime cannot be deleted because it has reservations'
            });
        }
        await client.query('BEGIN');
        transactionStarted = true;
        // Delete showtime seat inventory
        await client.query(
            `DELETE FROM showtime_seats
             WHERE showtime_id = $1`,
            [id]
        );
        // Delete showtime
        await client.query(
            `DELETE FROM showtimes
             WHERE id = $1`,
            [id]
        );
        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Showtime deleted successfully'
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
module.exports = {
    showtimesIdSeatsController,
    createShowtime,
    getShowtimes,
    getShowtimeById,
    updateShowtime,
    deleteShowtime

};