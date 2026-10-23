import express from "express";
import multer from "multer";
import fs from "fs";
import mammoth from "mammoth";
import { jobDescription } from "./jobRoutes.js";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

let resumes = [];

// 🔥 Skill extractor
const extractSkills = (text) => {
  const skillsList = [
    "python", "sql", "power bi", "excel",
    "machine learning", "java", "c++", "react",
    "node", "javascript", "html", "css"
  ];

  return skillsList.filter(skill =>
    text.toLowerCase().includes(skill)
  ).join(", ");
};

// 🔥 ATS Logic
const calculateMatchScore = (resumeSkills, jobDesc) => {
  if (!jobDesc) return { score: 0, missingSkills: [] };

  const jobWords = jobDesc.split(" ");
  const resumeWords = resumeSkills.split(", ");

  let matchCount = 0;

  resumeWords.forEach(skill => {
    if (jobWords.includes(skill)) matchCount++;
  });

  const score = Math.round((matchCount / jobWords.length) * 100);
  const missingSkills = jobWords.filter(skill => !resumeWords.includes(skill));

  return { score, missingSkills };
};

// ✅ GET ALL RESUMES (FIX FOR DASHBOARD)
router.get("/", (req, res) => {
  res.json(resumes);
});

// ✅ UPLOAD RESUME
router.post("/", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    let text = "";

    // 📄 PDF
    if (req.file.mimetype === "application/pdf") {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;

      let textContent = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        textContent += content.items.map(item => item.str).join(" ");
      }

      text = textContent;
    }

    // 📄 DOCX
    else if (req.file.mimetype.includes("word")) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    }

    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const skills = extractSkills(text);
    const experience = text.toLowerCase().includes("year") ? 2 : 0;

    const { score, missingSkills } =
      calculateMatchScore(skills, jobDescription);

    const newResume = {
      name: req.file.originalname,
      skills,
      experience,
      score,
      missingSkills
    };

    resumes.push(newResume);

    res.json({
      message: "Resume processed successfully",
      data: newResume
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export { resumes };
export default router;