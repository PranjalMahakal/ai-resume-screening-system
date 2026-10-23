const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Generate access token
const generateAccessToken = (payload) => {
  if (!ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not defined');
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  if (!REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not defined');
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
};

// Verify access token
const verifyAccessToken = (token) => {
  if (!ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not defined');
  return jwt.verify(token, ACCESS_SECRET);
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  if (!REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not defined');
  return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};