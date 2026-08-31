const express = require('express');
const router = express.Router();

const reservationsController = require('../controllers/reservationsController');

router.post('/reservations', reservationsController.createReservation);
router.post('/create-payment-intent', reservationsController.createPaymentIntent);

module.exports = router;