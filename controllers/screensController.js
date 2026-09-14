const db = require('../db');

const createScreen = async (req, res) => {
    try {
        // get data from req.body
        const { name, total_capacity } = req.body;

        // check/validate data
        if (!name || !total_capacity) {
            return res.status(400).json({
                message: "Name and total_capacity are required"
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
            total_capacity
        ]);

        return res.status(201).json({
            screen: rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const getScreens = async (req, res) => {
    try {
        // get all screens from database
        const { rows } = await db.query(`
            SELECT * FROM screens;
        `);

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

const deleteScreen = async (req, res) => {
    try {
        const { id } = req.params;

        // check if screen exists
        const { rows } = await db.query(`
            SELECT * FROM screens
            WHERE id = $1;
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Screen not found"
            });
        }

        // delete screen
        await db.query(`
            DELETE FROM screens
            WHERE id = $1;
        `, [id]);

        return res.status(200).json({
            message: "Screen deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const getScreenSeats = async (req, res) => {
  try {
    const screenId = req.params.screenId;

    const result = await pool.query(
      `SELECT id, row_letter, seat_number
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


const createScreenSeat = async (req, res) => {
  try {
    const screenId = req.params.screenId;
    const { rowLetter, seatNumber } = req.body;

    if (!rowLetter || seatNumber === undefined) {
      return res.status(400).json({
        message: 'rowLetter and seatNumber are required'
      });
    }

    const screenResult = await pool.query(
      `SELECT id
       FROM screens
       WHERE id = $1`,
      [screenId]
    );

    if (screenResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Screen not found'
      });
    }

    const result = await pool.query(
      `INSERT INTO seats (screen_id, row_letter, seat_number)
       VALUES ($1, $2, $3)
       RETURNING id, screen_id, row_letter, seat_number`,
      [screenId, rowLetter, seatNumber]
    );

    return res.status(201).json({
      message: 'Seat created successfully',
      seat: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    if (error.code === '23505') {
      return res.status(409).json({
        message: 'This seat already exists on this screen'
      });
    }

    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};

module.exports = {
    createScreen,
    getScreens,
    getScreenById,
    updateScreen,
    deleteScreen,
    getScreenSeats,
    createScreenSeat
};