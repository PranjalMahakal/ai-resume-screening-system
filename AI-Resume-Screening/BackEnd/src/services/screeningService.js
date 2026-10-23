'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const prisma    = require('../config/db');
const logger    = require('../utils/logger');
const { extractText } = require('../utils/parser');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// MAIN SCREENING FUNCTION
// ─────────────────────────────────────────────

/**
 * Screen a resume against a job and save results
 * @param {string} resumeId
 * @param {string} jobId
 * @returns {Promise<RankingResult>}
 */
async function screenResume(resumeId, jobId) {
  logger.info(`Starting screening: resume=${resumeId} job=${jobId}`);

  // 1. Load resume + job from DB
  const [resume, job] = await Promise.all([
    prisma.resume.findUnique({
      where: { id: resumeId },
      include: { parsedResume: true },
    }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);

  if (!resume) throw new Error(`Resume not found: ${resumeId}`);
  if (!job)    throw new Error(`Job not found: ${jobId}`);

  // 2. Get resume text — use already-parsed text or extract fresh
  let resumeText = resume.parsedResume?.rawText;
  if (!resumeText) {
    logger.info(`Extracting text from file: ${resume.filePath}`);
    resumeText = await extractText(resume.filePath);
  }

  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Could not extract meaningful text from resume');
  }

  // 3. Call Claude API for screening
  const screeningResult = await callClaudeScreening(resumeText, job);

  // 4. Save result to ranking_results table
  const ranking = await prisma.rankingResult.upsert({
    where : { jobId_resumeId: { jobId, resumeId } },
    update: {
      score          : screeningResult.score,
      matchedSkills  : screeningResult.matchedSkills,
      missingSkills  : screeningResult.missingSkills,
      experienceMatch: screeningResult.experienceMatch,
      aiSummary      : screeningResult.aiSummary,
    },
    create: {
      jobId,
      resumeId,
      score          : screeningResult.score,
      matchedSkills  : screeningResult.matchedSkills,
      missingSkills  : screeningResult.missingSkills,
      experienceMatch: screeningResult.experienceMatch,
      aiSummary      : screeningResult.aiSummary,
    },
  });

  // 5. Update resume status to PARSED
  await prisma.resume.update({
    where: { id: resumeId },
    data : { status: 'PARSED' },
  });

  // 6. Log the screening result
  logger.logScreening(
    resumeId,
    job.title,
    screeningResult.score,
    screeningResult.score >= 60 ? 'passed' : 'failed',
  );

  logger.info(`Screening complete: score=${screeningResult.score} resume=${resumeId}`);
  return ranking;
}

// ─────────────────────────────────────────────
// CLAUDE API CALL
// ─────────────────────────────────────────────

async function callClaudeScreening(resumeText, job) {
  const prompt = buildPrompt(resumeText, job);

  const message = await client.messages.create({
    model     : 'claude-opus-4-5',
    max_tokens: 1024,
    messages  : [{ role: 'user', content: prompt }],
  });

  const responseText = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return parseClaudeResponse(responseText, job);
}

// ─────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────

function buildPrompt(resumeText, job) {
  const requiredSkills    = (job.requiredSkills || []).join(', ') || 'Not specified';
  const experienceNeeded  = job.experienceYears ?? 'Not specified';

  return `You are an expert AI recruiter. Analyze the resume below against the job requirements and respond ONLY with a valid JSON object — no markdown, no explanation, just raw JSON.

JOB DETAILS:
- Title: ${job.title}
- Description: ${job.description}
- Required Skills: ${requiredSkills}
- Experience Required: ${experienceNeeded} years
- Requirements: ${job.requirements || 'Not specified'}

RESUME TEXT:
${resumeText.substring(0, 4000)}

Respond with this exact JSON structure:
{
  "score": <integer 0-100>,
  "matchedSkills": [<array of skills from required list found in resume>],
  "missingSkills": [<array of required skills NOT found in resume>],
  "experienceMatch": <true if candidate meets experience requirement, false otherwise>,
  "educationMatch": <true if education is suitable for the role, false otherwise>,
  "aiSummary": "<2-3 sentence summary of the candidate's fit for this role>"
}`;
}

// ─────────────────────────────────────────────
// RESPONSE PARSER
// ─────────────────────────────────────────────

function parseClaudeResponse(responseText, job) {
  try {
    // Strip any accidental markdown fences
    const clean = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    const parsed = JSON.parse(clean);

    return {
      score          : Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
      matchedSkills  : Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills  : Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      experienceMatch: Boolean(parsed.experienceMatch),
      educationMatch : Boolean(parsed.educationMatch),
      aiSummary      : parsed.aiSummary || 'No summary available.',
    };
  } catch (err) {
    logger.error('Failed to parse Claude response:', err);
    logger.error('Raw response:', responseText);

    // Fallback — return safe defaults so we don't crash
    return {
      score          : 0,
      matchedSkills  : [],
      missingSkills  : job.requiredSkills || [],
      experienceMatch: false,
      educationMatch : false,
      aiSummary      : 'Screening failed — could not parse AI response.',
    };
  }
}

// ─────────────────────────────────────────────
// BULK SCREENING — screen all resumes for a job
// ─────────────────────────────────────────────

/**
 * Screen all resumes that applied to a job and rank them
 * @param {string} jobId
 * @returns {Promise<RankingResult[]>}
 */
async function screenAllResumesForJob(jobId) {
  const applications = await prisma.application.findMany({
    where  : { jobId },
    include: { resume: true },
  });

  if (applications.length === 0) {
    throw new Error('No applications found for this job');
  }

  logger.info(`Bulk screening ${applications.length} resumes for job=${jobId}`);

  const results = [];
  for (const app of applications) {
    try {
      const result = await screenResume(app.resumeId, jobId);
      results.push(result);
    } catch (err) {
      logger.error(`Failed screening resume=${app.resumeId}:`, err.message);
    }
  }

  // Re-rank all results by score
  const ranked = await rankResults(jobId);
  return ranked;
}

// ─────────────────────────────────────────────
// RANKING — assign rank positions by score
// ─────────────────────────────────────────────

async function rankResults(jobId) {
  const results = await prisma.rankingResult.findMany({
    where  : { jobId },
    orderBy: { score: 'desc' },
  });

  // Update rank field for each result
  const updates = results.map((r, index) =>
    prisma.rankingResult.update({
      where: { id: r.id },
      data : { rank: index + 1 },
    })
  );

  await Promise.all(updates);

  return prisma.rankingResult.findMany({
    where  : { jobId },
    orderBy: { rank: 'asc' },
    include: {
      resume: {
        include: {
          user        : { select: { id: true, firstName: true, lastName: true, email: true } },
          parsedResume: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// GET RESULTS for a job (already screened)
// ─────────────────────────────────────────────

async function getScreeningResults(jobId) {
  return prisma.rankingResult.findMany({
    where  : { jobId },
    orderBy: { rank: 'asc' },
    include: {
      resume: {
        include: {
          user        : { select: { id: true, firstName: true, lastName: true, email: true } },
          parsedResume: true,
        },
      },
    },
  });
}

module.exports = {
  screenResume,
  screenAllResumesForJob,
  getScreeningResults,
  rankResults,
};