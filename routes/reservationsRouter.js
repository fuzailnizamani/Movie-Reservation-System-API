const express = require('express');
const router = express.Router();

const { createReservation, createPaymentIntent, getUserReservations, getUserReservationById, cancelReservation } = require('../controllers/reservationsController');
const { userAuthMiddleware } = require('../middleware/authMiddleware');

router.use(userAuthMiddleware);
router.get('/', getUserReservations);
router.get('/:id', getUserReservationById);
router.post('/', createReservation);
router.patch('/:id/cancel', cancelReservation);
router.post('/create-payment-intent', createPaymentIntent);

module.exports = router;