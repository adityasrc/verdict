import cors, { type CorsOptions } from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
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

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    handleError(res, err);
}); // 4 arguments for error handler

export default app;