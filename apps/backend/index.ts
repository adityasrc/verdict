import "dotenv/config";
import http from "http";
import app from "./api/app.js";
import { initializeSocketIO } from "./ws/socket.js";
import { redis } from "./utils/redis.js";
import S3Client from "./utils/S3client.js";

// Start the background worker in the same process
import "./workers/SubmissionWorker.js";

const ServerConfig = {
    httpPort: process.env.HTTP_PORT || 8600,
};

const httpServer = http.createServer(app);

initializeSocketIO(httpServer);

const startServer = async () => {

    try {
        await redis.ping();
        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Redis connection failed:", error instanceof Error ? error.message : error);
    }


    const r2Endpoint = process.env.R2_ENDPOINT || "";
    const s3Configured = r2Endpoint.startsWith("http://") || r2Endpoint.startsWith("https://");

    if (!s3Configured || r2Endpoint.includes("<account-id>")) {
        console.warn("S3/R2 not configured. File uploads are temporarily disabled.");
    } else {
        try {
            await S3Client.list();
            console.log("S3 connection established");
        } catch (error) {
            console.warn("S3 connection failed (non-fatal):", error instanceof Error ? error.message : error);
        }
    }

    httpServer.listen(Number(ServerConfig.httpPort), "0.0.0.0", () => {
        console.log(`Server is running on port ${ServerConfig.httpPort}`);
    });
};

startServer();

const exitHandler = () => {
    httpServer.close(() => {
        console.info("HTTP server closed");
        process.exit(0);
    });

    setTimeout(() => {
        console.warn("Forced exit");
        process.exit(1);
    }, 5000);
};

const unexpectedErrorHandler = (error: Error) => {
    console.error(error);
    exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", exitHandler);
process.on("SIGINT", exitHandler);