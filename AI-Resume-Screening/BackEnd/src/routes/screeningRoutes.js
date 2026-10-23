import express from "express";

const router = express.Router();

// TEMP DATA (replace later with DB)
let resumes = [
  { name: "Tejas", skills: "python sql power bi", experience: 2 },
  { name: "Rahul", skills: "java html css", experience: 1 },
];

let job = {
  title: "Data Analyst",
  skills: "python sql power bi",
  experience: 2,
};

// SCORING FUNCTION
const calculateScore = (resume, job) => {
  let score = 0;

  const jobSkills = job.skills.toLowerCase().split(" ");
  const resumeSkills = resume.skills.toLowerCase();

  jobSkills.forEach(skill => {
    if (resumeSkills.includes(skill)) score += 20;
  });

  if (resume.experience >= job.experience) score += 20;

  return score;
};

// API
router.get("/", (req, res) => {
  const results = resumes.map(r => ({
    name: r.name,
    score: calculateScore(r, job),
    summary: "Matched with job skills",
  }));

  res.json(results);
});

export default router;