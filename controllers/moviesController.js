const db = require('../db');

const createMovie = async (req, res) => {
    const { title, duration_minutes, release_date } = req.body;
    try {
        if (!title || !duration_minutes || !release_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        };

        const result = await db.query(
            `INSERT INTO 
            movies (title, duration_minutes, release_date) 
            VALUES ($1, $2, $3) 
            RETURNING id, title, duration_minutes, release_date`,
            [title, duration_minutes, release_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating movie:', error);
        res.status(500).json({ error: 'Internal server error ' });
    }
}

module.exports = {
    createMovie
};