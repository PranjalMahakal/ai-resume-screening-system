import express from "express";
import cors from "cors";

import resumeRoutes from "./routes/resumeRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/upload", resumeRoutes);
app.use("/api/job", jobRoutes);

app.get("/api/health", (req, res) => {
  res.json({ message: "API working" });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});