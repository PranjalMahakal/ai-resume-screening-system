/**
 * logger.js
 * Winston-based logger for AI-Resume-Screening
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// ─── Log directory ─────────────────────────────────────────────────────────────
const LOG_DIR = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─── Formats ───────────────────────────────────────────────────────────────────
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
);

// ─── Logger ────────────────────────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',

  transports: [
    ...(process.env.NODE_ENV !== 'production' || process.env.LOG_CONSOLE === 'true'
      ? [new transports.Console({ format: consoleFormat })]
      : []),

    new transports.File({
      filename : path.join(LOG_DIR, 'combined.log'),
      format   : fileFormat,
    }),

    new transports.File({
      filename : path.join(LOG_DIR, 'error.log'),
      level    : 'error',
      format   : fileFormat,
    }),

    new transports.File({
      filename : path.join(LOG_DIR, 'screening.log'),
      level    : 'info',
      format   : fileFormat,
    }),
  ],

  exceptionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(LOG_DIR, 'rejections.log') }),
  ],

  exitOnError: false,
});

// ─── Resume-specific helpers ───────────────────────────────────────────────────

/** Log a file upload event */
logger.logUpload = (fileId, filename, mimetype, size) =>
  logger.info('Resume uploaded', { fileId, filename, mimetype, size });

/** Log an AI screening result */
logger.logScreening = (fileId, jobTitle, score, status) =>
  logger.info('Resume screened', { fileId, jobTitle, score, status });

/** Log resume parse/extraction event */
logger.logParsed = (fileId, parsed) =>
  logger.info('Resume parsed', { fileId, ...parsed });

/** Log an error with optional Express request context */
logger.logError = (message, err, req = null) => {
  logger.error(message, {
    error : err?.message,
    stack : err?.stack,
    ...(req && { method: req.method, url: req.originalUrl, ip: req.ip }),
  });
};

module.exports = logger;