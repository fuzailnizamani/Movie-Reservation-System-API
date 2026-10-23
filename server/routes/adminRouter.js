const express = require('express');
const { getAdminReservations } = require('../controllers/adminReservationsController');
const { userAuthMiddleware, adminAuthMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/reservations',
  userAuthMiddleware,
  adminAuthMiddleware(['admin']),
  getAdminReservations
);

module.exports = router;
