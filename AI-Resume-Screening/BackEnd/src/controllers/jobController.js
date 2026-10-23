/**
 * jobController.js
 * Handles job posting CRUD
 */

const prisma  = require('../config/db');
const { sendSuccess, created, notFound, badRequest, forbidden } = require('../utils/response');
const { validateJobPost } = require('../utils/validator');
const logger = require('../utils/logger');

// ─── Create Job ────────────────────────────────────────────────────────────────
const createJob = async (req, res) => {
  try {
    const { valid, errors } = validateJobPost(req.body);
    if (!valid) return badRequest(res, 'Validation failed', errors);

    const { title, description, requiredSkills = [], experienceLevel, location, remote } = req.body;

    const job = await prisma.job.create({
      data: {
        userId        : req.user.id,
        title,
        description,
        requiredSkills,
        experienceLevel: experienceLevel || null,
        location       : location || null,
        remote         : remote ?? false,
      },
    });

    logger.info('Job created', { jobId: job.id, userId: req.user.id, title });
    return created(res, { job }, 'Job posting created successfully');
  } catch (err) {
    logger.logError('Create job error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── List Jobs ─────────────────────────────────────────────────────────────────
const listJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(search && {
        OR: [
          { title      : { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take   : parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select : {
          id             : true,
          title          : true,
          requiredSkills : true,
          experienceLevel: true,
          location       : true,
          remote         : true,
          createdAt      : true,
          _count         : { select: { screenings: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    return sendSuccess(res, {
      jobs,
      pagination: {
        total,
        page : parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.logError('List jobs error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Get Single Job ────────────────────────────────────────────────────────────
const getJob = async (req, res) => {
  try {
    const job = await prisma.job.findFirst({
      where  : { id: req.params.id, userId: req.user.id },
      include: { screenings: { orderBy: { score: 'desc' }, take: 5 } },
    });
    if (!job) return notFound(res, 'Job not found');

    return sendSuccess(res, { job });
  } catch (err) {
    logger.logError('Get job error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Update Job ────────────────────────────────────────────────────────────────
const updateJob = async (req, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!job) return notFound(res, 'Job not found');

    const { title, description, requiredSkills, experienceLevel, location, remote } = req.body;

    const updated = await prisma.job.update({
      where: { id: job.id },
      data : {
        ...(title          !== undefined && { title }),
        ...(description    !== undefined && { description }),
        ...(requiredSkills !== undefined && { requiredSkills }),
        ...(experienceLevel!== undefined && { experienceLevel }),
        ...(location       !== undefined && { location }),
        ...(remote         !== undefined && { remote }),
      },
    });

    logger.info('Job updated', { jobId: job.id, userId: req.user.id });
    return sendSuccess(res, { job: updated }, 'Job updated successfully');
  } catch (err) {
    logger.logError('Update job error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Delete Job ────────────────────────────────────────────────────────────────
const deleteJob = async (req, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!job) return notFound(res, 'Job not found');

    await prisma.job.delete({ where: { id: job.id } });

    logger.info('Job deleted', { jobId: job.id, userId: req.user.id });
    return sendSuccess(res, null, 'Job deleted successfully');
  } catch (err) {
    logger.logError('Delete job error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob };