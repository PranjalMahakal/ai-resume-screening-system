'use strict';

const screeningService = require('../services/screeningService');
const { sendSuccess, sendError, created } = require('../utils/response');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// POST /api/screenings
// Screen a single resume against a job
// ─────────────────────────────────────────────
const screenResume = async (req, res) => {
  try {
    const { resumeId, jobId } = req.body;

    if (!resumeId || !jobId) {
      return sendError(res, 'resumeId and jobId are required', 400);
    }

    const result = await screeningService.screenResume(resumeId, jobId);
    return created(res, result, 'Resume screened successfully');
  } catch (err) {
    logger.logError(err, req);
    return sendError(res, err.message || 'Screening failed', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/screenings/bulk/:jobId
// Screen ALL resumes that applied to a job
// ─────────────────────────────────────────────
const screenAllForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const results = await screeningService.screenAllResumesForJob(jobId);
    return sendSuccess(res, results, `Screened and ranked ${results.length} candidates`);
  } catch (err) {
    logger.logError(err, req);
    return sendError(res, err.message || 'Bulk screening failed', 500);
  }
};

// ─────────────────────────────────────────────
// GET /api/screenings/job/:jobId
// Get screening results for a job
// ─────────────────────────────────────────────
const getResultsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const results = await screeningService.getScreeningResults(jobId);
    return sendSuccess(res, results, 'Screening results fetched');
  } catch (err) {
    logger.logError(err, req);
    return sendError(res, err.message || 'Failed to fetch results', 500);
  }
};

// ─────────────────────────────────────────────
// POST /api/screenings/rank/:jobId
// Re-rank all results for a job
// ─────────────────────────────────────────────
const reRankJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const results = await screeningService.rankResults(jobId);
    return sendSuccess(res, results, 'Candidates re-ranked successfully');
  } catch (err) {
    logger.logError(err, req);
    return sendError(res, err.message || 'Re-ranking failed', 500);
  }
};

module.exports = { screenResume, screenAllForJob, getResultsByJob, reRankJob };