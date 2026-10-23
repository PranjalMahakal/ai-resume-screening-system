/**
 * response.js
 * Standard API response helpers for AI-Resume-Screening
 */

/**
 * Send a success response
 * @param {object} res      - Express response object
 * @param {*}      data     - Payload to send
 * @param {string} message  - Success message
 * @param {number} status   - HTTP status code (default 200)
 */
const sendSuccess = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({
    success : true,
    message,
    data,
  });
};

/**
 * Send an error response
 * @param {object} res     - Express response object
 * @param {string} message - Error message
 * @param {number} status  - HTTP status code (default 500)
 * @param {*}      errors  - Optional error details / validation errors
 */
const sendError = (res, message = 'Something went wrong', status = 500, errors = null) => {
  const payload = {
    success : false,
    message,
  };
  if (errors) payload.errors = errors;
  return res.status(status).json(payload);
};

/**
 * 400 Bad Request
 */
const badRequest = (res, message = 'Bad request', errors = null) =>
  sendError(res, message, 400, errors);

/**
 * 401 Unauthorized
 */
const unauthorized = (res, message = 'Unauthorized') =>
  sendError(res, message, 401);

/**
 * 403 Forbidden
 */
const forbidden = (res, message = 'Forbidden') =>
  sendError(res, message, 403);

/**
 * 404 Not Found
 */
const notFound = (res, message = 'Resource not found') =>
  sendError(res, message, 404);

/**
 * 409 Conflict
 */
const conflict = (res, message = 'Conflict') =>
  sendError(res, message, 409);

/**
 * 422 Unprocessable Entity (validation errors)
 */
const validationError = (res, errors, message = 'Validation failed') =>
  sendError(res, message, 422, errors);

/**
 * 201 Created
 */
const created = (res, data, message = 'Created successfully') =>
  sendSuccess(res, data, message, 201);

/**
 * 204 No Content
 */
const noContent = (res) => res.status(204).send();

module.exports = {
  sendSuccess,
  sendError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  created,
  noContent,
};