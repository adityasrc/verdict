import "dotenv/config";
import http from "http";
import app from "./api/app.js";
import { initSocket } from "./ws/socket.js";
import { redis } from "./utils/redis.js";
import S3Client from "./utils/S3client.js";
import { prisma } from "./utils/db.js";
import type { Worker } from "bullmq";

const ServerConfig = {
    httpPort: process.env.HTTP_PORT || 4000
};

const httpServer = http.createServer(app); // raw http server for express

initSocket(httpServer);

let embeddedSubmissionWorker: Worker | null = null;

const startServer = async () => {

    try {
        await redis.ping();
        console.log("Redis connected successfully");
    } catch (error) {
        console.error("Redis connection failed. Crashing application");
        process.exit(1); // kill server
    }


    const r2Endpoint = process.env.R2_ENDPOINT || "";
    const s3Configured = r2Endpoint.startsWith("http://") || r2Endpoint.startsWith("https://");

    if (!s3Configured || r2Endpoint.includes("<account-id>")) {
        console.warn("S3/R2 not configured. File uploads are temporarily disabled.");
    } else {
        try {
            await S3Client.checkHealth();
            console.log("S3 connection established");
        } catch (error) {
            console.warn("S3 connection failed :", error);
        }
    }

    if (process.env.RUN_WORKER_IN_API === "true") {
        const { submissionWorker } = await import("./workers/SubmissionWorker.js");
        embeddedSubmissionWorker = submissionWorker;
        console.log("Submission worker started inside API process");
    }

    httpServer.listen(Number(ServerConfig.httpPort), "0.0.0.0", () => { // accept req from any ip address
        console.log(`Server is running on port ${ServerConfig.httpPort}`);
    });
};

startServer();

const exitHandler = async () => {
    console.info("SIGTERM received. Starting Shutdown.");

    httpServer.close(async () => {
        console.info("HTTP server closed.");

        try {
            if (embeddedSubmissionWorker) {
                await embeddedSubmissionWorker.close();
                console.info("Submission worker closed.");
            }

            await prisma.$disconnect();
            console.info("Prisma disconnected.");

            await redis.quit();
            console.info("Redis disconnected.");

            process.exit(0); // clean exit
        } catch (e) {
            console.info("Error during shutdown: ", e);
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.warn("Forced exit after 5 seconds");
        process.exit(1);
    }, 5000);
};

// Event Listeners

process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception: ", error);
    exitHandler();
});

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection: ", error);
    exitHandler();
});

process.on("SIGTERM", exitHandler); // signal terminate (system)
process.on("SIGINT", exitHandler); // signal interrupt (user)
