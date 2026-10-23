/**
 * resumeController.js
 * Handles resume upload, list, get, and delete
 */

const fs     = require('fs');
const prisma  = require('../config/db');
const { extractText, parseResumeFields } = require('../utils/parser');
const { sendSuccess, created, notFound, badRequest } = require('../utils/response');
const { validateResumeFile } = require('../utils/validator');
const logger = require('../utils/logger');

// ─── Upload Resume ─────────────────────────────────────────────────────────────
const uploadResume = async (req, res) => {
  try {
    const file = req.file;
    const { valid, errors } = validateResumeFile(file);
    if (!valid) return badRequest(res, 'Invalid file', errors);

    // Extract & parse text from PDF/DOCX
    const { text, ext } = await extractText(file.path);
    const parsed        = parseResumeFields(text);

    const resume = await prisma.resume.create({
      data: {
        userId      : req.user.id,
        filename    : file.filename,
        originalName: file.originalname,
        mimetype    : file.mimetype,
        size        : file.size,
        path        : file.path,
        email       : parsed.email,
        phone       : parsed.phone,
        skills      : parsed.skills,
        experience  : parsed.experience,
        education   : parsed.education,
        rawText     : parsed.rawText,
        wordCount   : parsed.wordCount,
      },
    });

    logger.logUpload(resume.id, file.originalname, file.mimetype, file.size);
    logger.logParsed(resume.id, {
      email    : parsed.email,
      phone    : parsed.phone,
      skills   : parsed.skills,
      wordCount: parsed.wordCount,
    });

    return created(res, { resume }, 'Resume uploaded and parsed successfully');
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.logError('Upload resume error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── List Resumes ──────────────────────────────────────────────────────────────
const listResumes = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({
        where  : { userId: req.user.id },
        skip,
        take   : parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select : {
          id          : true,
          originalName: true,
          mimetype    : true,
          size        : true,
          email       : true,
          phone       : true,
          skills      : true,
          wordCount   : true,
          createdAt   : true,
        },
      }),
      prisma.resume.count({ where: { userId: req.user.id } }),
    ]);

    return sendSuccess(res, {
      resumes,
      pagination: {
        total,
        page    : parseInt(page),
        limit   : parseInt(limit),
        pages   : Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.logError('List resumes error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Get Single Resume ─────────────────────────────────────────────────────────
const getResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!resume) return notFound(res, 'Resume not found');

    return sendSuccess(res, { resume });
  } catch (err) {
    logger.logError('Get resume error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Delete Resume ─────────────────────────────────────────────────────────────
const deleteResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!resume) return notFound(res, 'Resume not found');

    // Delete physical file
    if (fs.existsSync(resume.path)) {
      fs.unlinkSync(resume.path);
    }

    await prisma.resume.delete({ where: { id: resume.id } });

    logger.info('Resume deleted', { resumeId: resume.id, userId: req.user.id });
    return sendSuccess(res, null, 'Resume deleted successfully');
  } catch (err) {
    logger.logError('Delete resume error', err, req);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { uploadResume, listResumes, getResume, deleteResume };