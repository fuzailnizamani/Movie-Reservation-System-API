const db = require('../db');
const { post } = require('../routes/reservationsRouter');

const createMovie = async (req, res) => {
    const { title, description, genre, duration_minutes, release_date, poster } = req.body;
    try {
        console.log(title , description , genre, duration_minutes, release_date , poster);
        if (!title || !description || !genre || !duration_minutes || !release_date || !poster) {
            return res.status(400).json({ error: 'Missing required fields' });
        };

        const result = await db.query(
            `INSERT INTO 
            movies (title, duration_minutes, release_date, description, genre, poster) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, title, duration_minutes, release_date, description, genre, poster`,
            [title, duration_minutes, release_date, description, genre, poster]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating movie:', error);
        res.status(500).json({ error: 'Internal server error ' });
    }
};


const getAllMovies = async (req, res) => {
    const { search, genre } = req.query;
    console.log("Query parameters:", { search, genre });

    try {
        let query = 'SELECT * FROM movies';
        const values = [];
        const conditions = [];

        // Build conditions dynamically
        if (search) {
            values.push(`%${search}%`);
            conditions.push(`title ILIKE $${values.length}`);
        }

        if (genre) {
            values.push(`%${genre}%`);
            // conditions.push(`genre = $${values.length}`);
            conditions.push(`genre ILIKE $${values.length}`);
        }

        // Append conditions to the query if any exist
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Append a semicolon to terminate the query
        query += ';';

        // Execute a single database call
        const { rows } = await db.query(query, values);
        
        // Return a consistent JSON key
        return res.status(200).json({ movies: rows });

    } catch (error) {
        console.error('Error getAllMovies:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createMovie,
    getAllMovies
};