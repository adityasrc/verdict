import cors, { type CorsOptions } from "cors";
import express from "express";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOption: CorsOptions = {
    origin: true,
    credentials: true,
};

app.use(cors(corsOption));

export default app;