import cors, { type CorsOptions } from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { handleError } from "../utils/apiResponseHandler.js";

import router from "./router.js";

const app = express();

app.use(express.urlencoded({ extended: true })); // for strings or arrays
app.use(express.json()); // for json objects


const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : "http://localhost:5173";

const corsOption: CorsOptions = {
    origin: corsOrigin,
    credentials: true,
};

app.use(cors(corsOption));

// Rate limit auth endpoints to prevent brute-force attacks.
// 20 requests per 15 minutes per IP is generous for real users.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
});

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
});

app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authLimiter);
app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    handleError(res, err);
}); // 4 arguments for error handler

export default app;