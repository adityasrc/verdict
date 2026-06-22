import cors, { type CorsOptions } from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { handleError } from "../utils/apiResponseHandler.js";

import router from "./router.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOption: CorsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
};

app.use(cors(corsOption));

app.use("/api", router);

// Global error handler — must be registered after all routes
// Without this, Express returns an HTML error page instead of JSON
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    handleError(res, err);
});

export default app;