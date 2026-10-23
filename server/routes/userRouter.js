const express = require('express');
const router = express.Router();

const { registerUser, loginUser, logoutUser, refreshAccessToken } = require('../controllers/userController');
const { userAuthMiddleware } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);

router.post('/refresh-token', refreshAccessToken);
router.post('/logout', userAuthMiddleware, logoutUser);

module.exports = router;