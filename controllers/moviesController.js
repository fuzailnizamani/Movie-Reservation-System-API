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

const getMoviesById = async (req, res) => {
    const moviesId = req.params.id;
    try {
        if(!moviesId){
            return res.status(400).json( "Missing required parameter: 'id'." )
        }

        let query = 'SELECT * FROM movies WHERE Id = $1;';

        const { rows } = await db.query(query, [moviesId]);

        if(rows.length === 0){
            return res.status(404).json({ message: 'Movies not found' });
        }

        return res.status(200).json({movie: rows[0]});
    }catch (error){
        console.error('Error getMoviesById', error);
        return res.status(500).json({ error: 'Internal server error'});
    }
}

// controllers/movieController.js
const updateMovie = async (req, res) => {
    const movieId = req.params.id;
    const bodyFields = req.body;

    try {
        if (!bodyFields || Object.keys(bodyFields).length === 0) {
            return res.status(400).json({ error: "No valid update fields provided." });
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

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

module.exports = {
    createMovie,
    getAllMovies,
    getMoviesById,
    updateMovie
};