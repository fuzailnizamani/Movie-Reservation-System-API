const express = require('express');
const router = express.Router();
const showtimesController = require('../controllers/showtimesController');

router.get('/:id/seats', showtimesController.getShowtimeSeats);

module.exports = router;