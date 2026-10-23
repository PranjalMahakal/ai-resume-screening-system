/**
 * authRoutes.js
 */
const express = require('express');
const router  = express.Router();
const { register, login, logout, refreshToken, getMe } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

// Public routes
router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me',      authenticate, getMe);

module.exports = router;