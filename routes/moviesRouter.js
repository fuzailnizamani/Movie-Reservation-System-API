const express = require('express');
const router = express.Router();

const { createMovie, getAllMovies} = require('../controllers/moviesController');
const { userAuthMiddleware, adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply user authentication middleware to all routes
router.use(userAuthMiddleware);

router.post('/', adminAuthMiddleware(['admin']), createMovie);
router.get('/', getAllMovies);

module.exports = router;