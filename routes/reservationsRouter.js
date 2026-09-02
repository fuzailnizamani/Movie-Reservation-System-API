const express = require('express');
const router = express.Router();

const reservationsController = require('../controllers/reservationsController');
const userAuthMiddleware = require('../middleware/authMiddleware');

router.use(userAuthMiddleware);
router.post('/reservations', reservationsController.createReservation);
router.post('/create-payment-intent', reservationsController.createPaymentIntent);

module.exports = router;