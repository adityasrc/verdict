import cors, { type CorsOptions } from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { handleError } from "../utils/apiResponseHandler.js";

import router from "./router.js";

const app = express();

app.use(express.urlencoded({ extended: true })); // for strings or arrays
app.use(express.json()); // for json objects


const corsOption: CorsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173", // only accept requests from this origin
    credentials: true, // allow cookies to be sent
};

app.use(cors(corsOption));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    handleError(res, err);
}); // 4 arguments for error handler

export default app;