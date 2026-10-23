const db = require('../db');

const createScreen = async (req, res) => {
    try {
        // get data from req.body
        const { name, total_capacity } = req.body;

        // check/validate data for presence, avoiding falsy evaluation for 0
        if (!name || total_capacity === undefined || total_capacity === null) {
            return res.status(400).json({
                message: "Name and total_capacity are required"
            });
        }

        const capacity = Number(total_capacity);
        if (isNaN(capacity) || capacity <= 0) {
            return res.status(400).json({
                message: "Total capacity must be greater than 0"
            });
        }

        // create screen in database
        const query = `
            INSERT INTO screens (name, total_capacity)
            VALUES ($1, $2)
            RETURNING *;
        `;

        const { rows } = await db.query(query, [
            name,
            capacity
        ]);

        return res.status(201).json({
            screen: rows[0]
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


const getScreens = async (req, res) => {
    try {
        const archivedOnly = req.query.archivedOnly === 'true';
        if (archivedOnly && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: You do not have permission' });
        }
        const query = archivedOnly
            ? 'SELECT * FROM screens WHERE is_archived = TRUE ORDER BY id;'
            : 'SELECT * FROM screens WHERE is_archived = FALSE ORDER BY id;';
        const { rows } = await db.query(query);

        return res.status(200).json({
            screens: rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const getScreenById = async (req, res) => {
    try {
        const { id } = req.params;

        // find screen using id
        const { rows } = await db.query(`
            SELECT * FROM screens
            WHERE id = $1;
        `, [id]);

        // if screen does not exist
        if (rows.length === 0) {
            return res.status(404).json({
                message: "Screen not found"
            });
        }

        return res.status(200).json({
            screen: rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const updateScreen = async (req, res) => {
    try {
        const { id } = req.params;

        // check if screen exists
        const screenResult = await db.query(
            `SELECT * FROM screens WHERE id = $1;`,
            [id]
        );

        if (screenResult.rows.length === 0) {
            return res.status(404).json({
                message: "Screen not found"
            });
        }

        // get fields to update from req.body
        const { name, total_capacity } = req.body;

        // validate fields
        if (name === undefined && total_capacity === undefined) {
            return res.status(400).json({
                message: "Provide name or total_capacity to update"
            });
        }

        if (name !== undefined && !name) {
            return res.status(400).json({
                message: "Name cannot be empty"
            });
        }

        if (total_capacity !== undefined && (!Number.isInteger(total_capacity) || total_capacity <= 0)) {
            return res.status(400).json({
                message: "total_capacity must be a positive integer"
            });
        }

        // update screen
        const updateResult = await db.query(
            `UPDATE screens
             SET
                name = COALESCE($1, name),
                total_capacity = COALESCE($2, total_capacity)
             WHERE id = $3
             RETURNING *;`,
            [name, total_capacity, id]
        );

        return res.status(200).json({
            message: "Screen updated successfully",
            screen: updateResult.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const archiveScreen = async (req, res) => {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({ message: 'Invalid screen ID.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(
            `SELECT id, name, is_archived
             FROM screens
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );
        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                message: "Screen not found"
            });
        }
        const screen = rows[0];
        if (screen.is_archived) {
            await client.query('COMMIT');
            return res.status(200).json({
                message: 'Screen is already archived.',
                screen: { id: screen.id, is_archived: true },
                alreadyArchived: true
            });
        }
        const activeShowtime = await client.query(
            `SELECT 1
             FROM showtimes
             WHERE screen_id = $1 AND end_time > NOW()
             LIMIT 1`,
            [id]
        );
        if (activeShowtime.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                message: 'This screen has an upcoming or currently running showtime. Reschedule or complete it before archiving the screen.'
            });
        }
        const archived = await client.query(
            `UPDATE screens
             SET is_archived = TRUE
             WHERE id = $1
             RETURNING id, name, is_archived`,
            [id]
        );
        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Screen archived. Existing seats, showtimes, reservations, receipts, and payment history were preserved.',
            screen: archived.rows[0],
            alreadyArchived: false
        });
    } catch (error) {
        console.error(error);
        await client.query('ROLLBACK');
        return res.status(500).json({
            message: "Server error"
        });
    } finally {
        client.release();
    }
};

const restoreScreen = async (req, res) => {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({ message: 'Invalid screen ID.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const restored = await client.query(
            `UPDATE screens
             SET is_archived = FALSE
             WHERE id = $1
             RETURNING id, name, is_archived`,
            [id]
        );
        if (restored.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Screen not found' });
        }
        await client.query('COMMIT');
        return res.status(200).json({
            message: 'Screen restored. It is available for future scheduling; no showtimes were recreated.',
            screen: restored.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to restore screen:', error);
        return res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

const getScreenSeats = async (req, res) => {
    try {
        const screenId = req.params.screenId;

        // Verify if the screen exists
        const screenCheck = await db.query(
            `SELECT id FROM screens WHERE id = $1`,
            [screenId]
        );

        if (screenCheck.rows.length === 0) {
            return res.status(404).json({
                message: 'Screen does not exist'
            });
        }

        const result = await db.query(
            `SELECT id, row_letter, seat_number, category, surcharge_cents
            FROM seats
            WHERE screen_id = $1
            ORDER BY row_letter, seat_number`,
            [screenId]
        );

        return res.status(200).json({
            screenId,
            seats: result.rows
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

const updateScreenSeatPricing = async (req, res) => {
    const { screenId, seatId } = req.params;
    const { category, surchargeCents } = req.body;
    const allowedCategories = ['standard', 'premium', 'extra_legroom', 'vip'];

    if (!/^[1-9]\d*$/.test(screenId) || !/^[1-9]\d*$/.test(seatId)) {
        return res.status(400).json({ error: 'Invalid screen or seat ID.' });
    }
    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ error: 'Choose a supported seat category.' });
    }
    if (!Number.isSafeInteger(surchargeCents) || surchargeCents < 0 || surchargeCents > 99999999) {
        return res.status(400).json({ error: 'surchargeCents must be a non-negative integer.' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const seat = await client.query(
            `SELECT seats.id
             FROM seats
             JOIN screens ON screens.id = seats.screen_id
             WHERE seats.id = $1 AND seats.screen_id = $2
               AND screens.is_archived = FALSE
             FOR UPDATE OF seats`,
            [seatId, screenId]
        );
        if (seat.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Seat not found on this screen.' });
        }
        const held = await client.query(
            `SELECT 1
             FROM showtime_seats
             WHERE seat_id = $1 AND status = 'pending_payment'
             LIMIT 1`,
            [seatId]
        );
        if (held.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Seat category cannot change while this seat is held for payment.' });
        }

        const updated = await client.query(
            `UPDATE seats
             SET category = $1, surcharge_cents = $2
             WHERE id = $3 AND screen_id = $4
             RETURNING id, row_letter, seat_number, category, surcharge_cents`,
            [category, surchargeCents, seatId, screenId]
        );
        await client.query('COMMIT');
        return res.json({ seat: updated.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to update seat category pricing:', error);
        return res.status(500).json({ error: 'Failed to update seat pricing.' });
    } finally {
        client.release();
    }
};


const createScreenSeat = async (req, res) => {
    const client = await db.pool.connect();
    let transactionStarted = false;
    try {
        const screenId = req.params.screenId;
        const { rowLetters, seatsPerRow } = req.body;

        if (
            !rowLetters ||
            !Array.isArray(rowLetters) ||
            rowLetters.length === 0 ||
            seatsPerRow === undefined ||
            seatsPerRow === null
        ) {
            return res.status(400).json({
                message: 'rowLetters and seatsPerRow are required'
            });
        }

        const parsedSeatsPerRow = Number(seatsPerRow);
        if (isNaN(parsedSeatsPerRow) || parsedSeatsPerRow <= 0) {
            return res.status(400).json({
                message: 'seatsPerRow must be greater than 0'
            });
        };

        await client.query('BEGIN');
        transactionStarted = true;
        const screenResult = await client.query(
            `SELECT id, is_archived
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
            return res.status(409).json({ message: 'Cannot add seats to an archived screen.' });
        }

        const createdSeats = [];

        for (const rowLetter of rowLetters) {
            for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
                const result = await client.query(
                    `INSERT INTO seats (screen_id, row_letter, seat_number)
                        VALUES ($1, $2, $3)
                        RETURNING id, screen_id, row_letter, seat_number`,
                    [screenId, rowLetter, seatNumber]
                );

                createdSeats.push(result.rows[0]);
            }
        }

        await client.query('COMMIT');
        transactionStarted = false;
        return res.status(201).json({
            message: 'Seats created successfully',
            seats: createdSeats
        });

    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK');
        }
        console.error(error);

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'One or more seats already exist on this screen'
            });
        }

        return res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        client.release();
    }
};

module.exports = {
    createScreen,
    getScreens,
    getScreenById,
    updateScreen,
    deleteScreen: archiveScreen,
    archiveScreen,
    restoreScreen,
    getScreenSeats,
    updateScreenSeatPricing,
    createScreenSeat
};