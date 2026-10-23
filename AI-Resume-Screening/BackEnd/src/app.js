// src/app.js
'use strict';

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const swaggerUi    = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger           = require('./utils/logger');
const { sendError }    = require('./utils/response');

// Routes
const authRoutes      = require('./routes/authRoutes');
const resumeRoutes    = require('./routes/resumeRoutes');
const jobRoutes       = require('./routes/jobRoutes');
const screeningRoutes = require('./routes/screeningRoutes');

const app = express();

// ─────────────────────────────────────────────
// SECURITY HEADERS
// ─────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────

// Global limiter — 200 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 200,
  standardHeaders: true,
  legacyHeaders  : false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth routes — 10 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 10,
  standardHeaders: true,
  legacyHeaders  : false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

// ─────────────────────────────────────────────
// BODY PARSING
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────
// HTTP REQUEST LOGGING
// ─────────────────────────────────────────────
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
  skip: (req) => req.path === '/api/health',   // skip health check noise
}));

// ─────────────────────────────────────────────
// SWAGGER / API DOCS
// ─────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title      : 'AI Resume Screening API',
      version    : '1.0.0',
      description: 'REST API for AI-powered resume screening and candidate ranking',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5000}`, description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type  : 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],   // JSDoc annotations in route files
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'AI Resume API Docs',
  swaggerOptions : { persistAuthorization: true },
}));

// Serve raw spec as JSON
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success  : true,
    status   : 'ok',
    service  : 'ai-resume-screening-api',
    version  : process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime   : `${Math.floor(process.uptime())}s`,
    env      : process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/resumes',   resumeRoutes);
app.use('/api/jobs',      jobRoutes);
app.use('/api/screenings', screeningRoutes);

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File too large. Maximum size is 5MB.', 413);
  }

  // CORS error
  if (err.message && err.message.startsWith('CORS:')) {
    return sendError(res, err.message, 403);
  }

  // JWT / auth errors bubbled up from middleware
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired token', 401);
  }

  // Log unexpected errors
  logger.logError(err, req);

  const isDev = process.env.NODE_ENV === 'development';
  sendError(
    res,
    isDev ? err.message : 'Internal server error',
    err.status || 500,
    isDev ? { stack: err.stack } : undefined,
  );
});

module.exports = app;