import express from "express";

const router = express.Router();

let jobDescription = "";

// ✅ Save Job
router.post("/", (req, res) => {
  jobDescription = req.body.description.toLowerCase();

  res.json({ message: "Job description saved" });
});

// ✅ Get Job
router.get("/", (req, res) => {
  res.json({ jobDescription });
});

export { jobDescription };
export default router;