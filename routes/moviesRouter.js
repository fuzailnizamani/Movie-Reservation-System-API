const express = require('express');
const router = express.Router();

const moviesController = require('../controllers/moviesController');
const { userAuthMiddleware, adminAuthMiddleware } = require('../middleware/authMiddleware');

// Apply user authentication middleware to all routes
router.use(userAuthMiddleware);

router.post('/movies', adminAuthMiddleware(['admin']), moviesController.createMovie);

module.exports = router;