import cors from "cors";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { errorMiddleware } from "./middleware/error.middleware.js";

import authRoutes from "./routes/auth.js";
import assignmentRoutes from "./routes/assignment.js";
import submissionRoutes from "./routes/submission.js";
import rubricRoutes from "./routes/rubric.js";

const app = express();

// trust first proxy (Render | Cloudflare) for rate limiter and accurate IP tracking
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : "http://localhost:5173";

app.use(cors({ origin: corsOrigin, credentials: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
});

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/rubrics", rubricRoutes);

app.use(errorMiddleware);

export default app;