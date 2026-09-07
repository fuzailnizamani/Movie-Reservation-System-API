const express = require('express');
const router = express.Router();

const { createReservation, createPaymentIntent, getUserReservations, getUserReservationById } = require('../controllers/reservationsController');
const { userAuthMiddleware } = require('../middleware/authMiddleware');

router.use(userAuthMiddleware);
router.get('/reservations', getUserReservations);
router.get('/reservations/:id', getUserReservationById);
router.post('/reservations', createReservation);
router.post('/create-payment-intent', createPaymentIntent);

module.exports = router;