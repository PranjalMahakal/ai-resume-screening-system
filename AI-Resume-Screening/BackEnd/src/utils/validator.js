/**
 * validator.js
 * Input validation helpers for AI-Resume-Screening
 */

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTS  = ['.pdf', '.docx'];
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5 MB

// ─── File validators ───────────────────────────────────────────────────────────

/**
 * Validate an uploaded resume file object (from multer)
 * @param {object} file - Multer file object
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateResumeFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file uploaded.');
    return { valid: false, errors };
  }

  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    errors.push(`Invalid file type: ${file.mimetype}. Only PDF and DOCX are allowed.`);
  }

  const ext = require('path').extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    errors.push(`Invalid extension: ${ext}. Only .pdf and .docx are allowed.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB. Max allowed is ${
        MAX_FILE_SIZE / 1024 / 1024
      } MB.`
    );
  }

  return { valid: errors.length === 0, errors };
};

// ─── Auth / User validators ────────────────────────────────────────────────────

/**
 * Validate registration input
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateRegister = (body) => {
  const errors = [];
  const { name, email, password } = body;

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate login input
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateLogin = (body) => {
  const errors = [];
  const { email, password } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || password.length < 1) {
    errors.push('Password is required.');
  }

  return { valid: errors.length === 0, errors };
};

// ─── Job / Screening validators ────────────────────────────────────────────────

/**
 * Validate job posting input
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateJobPost = (body) => {
  const errors = [];
  const { title, description, requiredSkills } = body;

  if (!title || title.trim().length < 3) {
    errors.push('Job title must be at least 3 characters.');
  }

  if (!description || description.trim().length < 20) {
    errors.push('Job description must be at least 20 characters.');
  }

  if (requiredSkills !== undefined) {
    if (!Array.isArray(requiredSkills)) {
      errors.push('requiredSkills must be an array.');
    } else if (requiredSkills.length === 0) {
      errors.push('At least one required skill must be provided.');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate a screening / match score request
 * @param {object} body - req.body
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateScreeningRequest = (body) => {
  const errors = [];
  const { resumeId, jobId } = body;

  if (!resumeId) errors.push('resumeId is required.');
  if (!jobId)    errors.push('jobId is required.');

  return { valid: errors.length === 0, errors };
};

// ─── Generic helpers ───────────────────────────────────────────────────────────

/**
 * Check if a value is a non-empty string
 */
const isNonEmptyString = (val) =>
  typeof val === 'string' && val.trim().length > 0;

/**
 * Check if a value is a positive integer
 */
const isPositiveInt = (val) =>
  Number.isInteger(val) && val > 0;

/**
 * Sanitize a string — trim and remove dangerous HTML chars
 */
const sanitizeString = (val = '') =>
  val.trim().replace(/[<>"']/g, '');

module.exports = {
  validateResumeFile,
  validateRegister,
  validateLogin,
  validateJobPost,
  validateScreeningRequest,
  isNonEmptyString,
  isPositiveInt,
  sanitizeString,
};