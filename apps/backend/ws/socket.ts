import type { Server as HTTPServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { redis } from "../utils/redis.js";
import { submissionHandlers } from "./handlers.js";

export interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

let io: Server;

export const initSocket = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Dedicated redis client for listening to pub/sub messages
    const sub = redis.duplicate();

    sub.psubscribe("submission:*").catch((err: Error) => {
        console.error("Failed to subscribe to submission updates:", err.message);
    });

    sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
        const submissionId = channel.replace(/^submission:/, "");
        if (!submissionId) return;

        try {
            const event = JSON.parse(message);
            const eventWithId = { ...event, submissionId };

            io.to(submissionId).emit("submission-progress", eventWithId);

            if (event.assignmentId) {
                io.to(`assignment:${event.assignmentId}`).emit("assignment-grading-progress", eventWithId);
            }
        } catch {
            console.error("Failed to parse redis message:", message);
        }
    });

    // Verify JWT on initial connection
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) {
            return next(new Error("Authentication required"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new Error("Server misconfiguration"));
        }

        try {
            const decoded = jwt.verify(token, secret) as { userId: string; role: string };
            (socket as AuthenticatedSocket).userId = decoded.userId;
            (socket as AuthenticatedSocket).role = decoded.role;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        const authedSocket = socket as AuthenticatedSocket;
        submissionHandlers(authedSocket);
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initSocket first.");
    }
    return io;
};

export default { initSocket, getIO };