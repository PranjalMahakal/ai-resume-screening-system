/**
 * authController.js
 * Handles register, login, logout, and token refresh
 */

const bcrypt = require('bcryptjs');
const prisma  = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { sendSuccess, created, badRequest, unauthorized, conflict } = require('../utils/response');
const { validateRegister, validateLogin } = require('../utils/validator');
const logger = require('../utils/logger');

// ─── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { valid, errors } = validateRegister(req.body);
    if (!valid) return badRequest(res, 'Validation failed', errors);

    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return conflict(res, 'Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    return created(res, { user }, 'Registration successful');
  } catch (err) {
    logger.logError('Register error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { valid, errors } = validateLogin(req.body);
    if (!valid) return badRequest(res, 'Validation failed', errors);

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return unauthorized(res, 'Invalid email or password');

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return unauthorized(res, 'Invalid email or password');

    const payload      = { id: user.id, email: user.email, role: user.role };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data:  { refreshToken },
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly : true,
      secure   : process.env.NODE_ENV === 'production',
      sameSite : 'strict',
      maxAge   : 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info('User logged in', { userId: user.id });

    return sendSuccess(res, {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, 'Login successful');
  } catch (err) {
    logger.logError('Login error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Clear refresh token from DB
      await prisma.user.updateMany({
        where: { refreshToken: token },
        data:  { refreshToken: null },
      });
    }

    res.clearCookie('refreshToken');
    logger.info('User logged out', { userId: req.user?.id });

    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    logger.logError('Logout error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return unauthorized(res, 'No refresh token provided');

    const decoded = verifyRefreshToken(token);

    const user = await prisma.user.findFirst({
      where: { id: decoded.id, refreshToken: token },
    });
    if (!user) return unauthorized(res, 'Invalid refresh token');

    const payload     = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);

    return sendSuccess(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    logger.logError('Refresh token error', err, req);
    return unauthorized(res, 'Invalid or expired refresh token');
  }
};

// ─── Get current user (me) ─────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where  : { id: req.user.id },
      select : { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return sendSuccess(res, { user });
  } catch (err) {
    logger.logError('GetMe error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { register, login, logout, refreshToken, getMe };