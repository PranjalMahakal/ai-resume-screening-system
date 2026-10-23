/**
 * authenticate.js
 * JWT authentication middleware
 */

const { verifyAccessToken } = require('../config/jwt');
const { unauthorized }      = require('../utils/response');
const logger                = require('../utils/logger');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token   = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    logger.logError('Authentication failed', err, req);
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = authenticate;