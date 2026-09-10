const express = require('express');
const router = express.Router();

const { createMovie, getAllMovies, getMoviesById, updateMovie, deleteMovie} = require('../controllers/moviesController');
const { userAuthMiddleware, adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply user authentication middleware to all routes
router.use(userAuthMiddleware);

router.post('/', adminAuthMiddleware(['admin']), createMovie);
router.get('/', getAllMovies);
router.get('/:id', getMoviesById);
router.patch('/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

module.exports = router;