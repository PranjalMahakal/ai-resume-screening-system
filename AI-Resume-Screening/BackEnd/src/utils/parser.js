/**
 * parser.js
 * PDF and DOCX text extractor for AI-Resume-Screening
 */

const fs      = require('fs');
const path    = require('path');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const logger   = require('./logger');

/**
 * Extract plain text from a PDF file
 * @param {string} filePath - Absolute or relative path to the PDF
 * @returns {Promise<string>} Extracted text
 */
const extractFromPDF = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const data   = await pdfParse(buffer);
    logger.info('PDF parsed successfully', { filePath, pages: data.numpages });
    return data.text.trim();
  } catch (err) {
    logger.logError('Failed to parse PDF', err);
    throw new Error(`PDF extraction failed: ${err.message}`);
  }
};

/**
 * Extract plain text from a DOCX file
 * @param {string} filePath - Absolute or relative path to the DOCX
 * @returns {Promise<string>} Extracted text
 */
const extractFromDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.messages.length) {
      logger.warn('DOCX parse warnings', { filePath, messages: result.messages });
    }
    logger.info('DOCX parsed successfully', { filePath });
    return result.value.trim();
  } catch (err) {
    logger.logError('Failed to parse DOCX', err);
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
};

/**
 * Auto-detect file type and extract text
 * @param {string} filePath - Path to the uploaded resume file
 * @returns {Promise<{ text: string, ext: string }>}
 */
const extractText = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const text = await extractFromPDF(filePath);
    return { text, ext };
  }

  if (ext === '.docx') {
    const text = await extractFromDOCX(filePath);
    return { text, ext };
  }

  throw new Error(`Unsupported file type: ${ext}. Only .pdf and .docx are allowed.`);
};

/**
 * Basic resume field extraction from raw text
 * Returns a structured object with common resume sections
 * @param {string} text - Raw extracted text
 * @returns {object}
 */
const parseResumeFields = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  // Phone
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{8,14}\d)/);
  const phone = phoneMatch ? phoneMatch[0].trim() : null;

  // Skills — looks for a "Skills" section
  const skillsIndex = lines.findIndex((l) =>
    /^skills?[:\s]*/i.test(l)
  );
  const skills =
    skillsIndex !== -1
      ? lines
          .slice(skillsIndex + 1, skillsIndex + 10)
          .join(' ')
          .split(/[,|•\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 40)
      : [];

  // Experience — looks for an "Experience" section
  const expIndex = lines.findIndex((l) =>
    /^(work\s)?experience[:\s]*/i.test(l)
  );
  const experience =
    expIndex !== -1
      ? lines.slice(expIndex + 1, expIndex + 15).join(' ')
      : null;

  // Education — looks for an "Education" section
  const eduIndex = lines.findIndex((l) =>
    /^education[:\s]*/i.test(l)
  );
  const education =
    eduIndex !== -1
      ? lines.slice(eduIndex + 1, eduIndex + 8).join(' ')
      : null;

  return {
    email,
    phone,
    skills,
    experience,
    education,
    rawText: text,
    wordCount: text.split(/\s+/).length,
  };
};

module.exports = {
  extractText,
  extractFromPDF,
  extractFromDOCX,
  parseResumeFields,
};