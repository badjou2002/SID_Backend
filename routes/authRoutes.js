const express = require('express');
const router = express.Router();
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * Auth Routes
 */

// POST /api/auth/register  — Create a new account
router.post('/register', register);

// POST /api/auth/login     — Login and receive JWT
router.post('/login', login);

// GET  /api/auth/me        — Get current user (requires JWT)
router.get('/me', protect, me);

module.exports = router;
