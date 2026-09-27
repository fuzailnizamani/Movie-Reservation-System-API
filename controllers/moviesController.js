const db = require('../db');

const createMovie = async (req, res) => {
    const { title, description, genre, duration_minutes, release_date, poster } = req.body;
    try {
        if (!title || duration_minutes === undefined || !release_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const dur = Number(duration_minutes);
        if (isNaN(dur) || dur <= 0) {
            return res.status(400).json({ error: 'Duration minutes must be greater than 0.' });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(release_date) || isNaN(Date.parse(release_date))) {
            return res.status(400).json({ error: 'Invalid release date format. Use YYYY-MM-DD.' });
        }

        console.log(title, description, genre, duration_minutes, release_date, poster);

        const result = await db.query(
            `INSERT INTO 
            movies (title, duration_minutes, release_date, description, genre, poster) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, title, duration_minutes, release_date, description, genre, poster`,
            [title, duration_minutes, release_date, description || null, genre || null, poster || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating movie:', error);
        res.status(500).json({ error: 'Internal server error ' });
    }
};


const getAllMovies = async (req, res) => {
    const { search, genre } = req.query;
    const userId = req.user?.userId;

    try {
        const userResult = await db.query(
            `SELECT role FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const userRole = userResult.rows[0].role;

        let query = 'SELECT * FROM movies';
        const values = [];
        const conditions = [];

        if (userRole !== 'admin') {
            conditions.push('is_archived = FALSE');
        }
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

const getMoviesById = async (req, res) => {
    const moviesId = req.params.id;
    const userId = req.user?.userId;
    try {
        const userResult = await db.query(
            `SELECT role FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const userRole = userResult.rows[0].role;
        if (!moviesId) {
            return res.status(400).json("Missing required parameter: 'id'.")
        }
        if (!Number.isInteger(Number(moviesId)) || Number(moviesId) <= 0) {
            return res.status(400).json({
                error: 'Movie ID must be a valid positive number.'
            });
        }
        let query = 'SELECT * FROM movies WHERE Id = $1';
        if (userRole !== 'admin') {
            query += ' AND is_archived = FALSE';
        }
        const { rows } = await db.query(query, [moviesId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Movies not found' });
        }
        return res.status(200).json({ movie: rows[0] });
    } catch (error) {
        console.error('Error getMoviesById', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// controllers/movieController.js
const updateMovie = async (req, res) => {
    const movieId = req.params.id;
    const bodyFields = req.body;
    try {
        if (!Number.isInteger(Number(movieId)) || Number(movieId) <= 0) {
            return res.status(400).json({
                error: 'Movie ID must be a valid positive number.'
            });
        }
        if (!bodyFields || Object.keys(bodyFields).length === 0) {
            return res.status(400).json({ error: "No valid update fields provided." });
        }
        if (bodyFields.duration_minutes !== undefined) {
            const dur = Number(bodyFields.duration_minutes);
            if (isNaN(dur) || dur <= 0) {
                return res.status(400).json({
                    error: 'Duration minutes must be greater than 0.'
                });
            }
        }

        if (bodyFields.release_date !== undefined) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(bodyFields.release_date) || isNaN(Date.parse(bodyFields.release_date))) {
                return res.status(400).json({
                    error: 'Invalid release date format. Use YYYY-MM-DD.'
                });
            }
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;
        const allowedFields = [
            'title',
            'description',
            'genre',
            'duration_minutes',
            'release_date',
            'poster'
        ];

        for (const key of Object.keys(bodyFields)) {
            if (!allowedFields.includes(key)) {
                return res.status(400).json({
                    error: `Invalid update field: ${key}`
                });
            }
        }

        for (const [key, value] of Object.entries(bodyFields)) {
            if (value !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "No valid update fields provided." });
        }
        values.push(movieId);
        const query = `
            UPDATE movies 
            SET ${updates.join(', ')} 
            WHERE id = $${paramIndex} 
            RETURNING *;
        `;
        const { rows } = await db.query(query, values);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Movie not found' });
        }
        return res.status(200).json({ movie: rows[0] });
    } catch (error) {
        console.error('Error updateMovie:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteMovie = async (req, res) => {
    try {
        const movieId = req.params.id;
        if (!Number.isInteger(Number(movieId)) || Number(movieId) <= 0) {
            return res.status(400).json({
                error: 'Movie ID must be a valid positive number.'
            });
        }
        if (!movieId) {
            return res.status(400).json({ error: 'MovieIdID is required' });
        }
        // Check if movie exists
        const movieResult = await db.query(
            `SELECT id, is_archived
                FROM movies
                WHERE id = $1`,
            [movieId]
        );
        if (movieResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Movie not found'
            });
        }
        const movie = movieResult.rows[0];
        // Already archived
        if (movie.is_archived) {
            return res.status(400).json({
                message: 'Movie is already archived'
            });
        }
        // Check for current or future showtimes
        const showtimeResult = await db.query(
            `SELECT id
                FROM showtimes
                WHERE movie_id = $1
                AND end_time > NOW()
                LIMIT 1`,
            [movieId]
        );
        if (showtimeResult.rows.length > 0) {
            return res.status(400).json({
                message: 'Movie cannot be archived because it has a current or upcoming showtime'
            });
        }
        // Archive movie
        await db.query(
            `UPDATE movies
                SET is_archived = TRUE
                WHERE id = $1`,
            [movieId]
        );
        return res.status(200).json({
            message: 'Movie archived successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

module.exports = {
    createMovie,
    getAllMovies,
    getMoviesById,
    updateMovie,
    deleteMovie
};