import type { Server as HTTPServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";

import { redis } from "../utils/redis.js";
import {
    notificationHandlers,
    submissionHandlers,
} from "./handlers.js";

interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

let io: Server;

export const initializeSocketIO = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Create a dedicated Redis subscriber to avoid blocking the main client
    const sub = redis.duplicate();

    sub.psubscribe("submission:*")
        .then((count) => {
            console.log(
                `Subscribed to ${count} channels. Listening for updates on submission:*`,
            );
        })
        .catch((err: Error) => {
            console.error("Failed to subscribe: %s", err.message);
        });

    // Added underscore to _pattern to bypass strict mode "unused variable" error
    sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
        const submissionId = channel.split(":")[1];
        if (submissionId) {
            try {
                const event = JSON.parse(message);
                
                // Construct a unified payload
                const eventWithId = { ...event, submissionId };
                
                // Emit to the specific student's room
                io.to(submissionId).emit("submission-progress", eventWithId);

                // Emit to the broader assignment room for teachers
                if (event.assignmentId) {
                    io.to(`assignment:${event.assignmentId}`).emit(
                        "assignment-grading-progress",
                        eventWithId,
                    );
                }
            } catch (_error) {
                console.error("Failed to parse message:", message);
            }
        }
    });

    // Reject any client that does not send a valid JWT in the handshake
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
        console.log(`Client connected: ${authedSocket.id} (user: ${authedSocket.userId})`);

        submissionHandlers(authedSocket);
        notificationHandlers(authedSocket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${authedSocket.id}`);
        });
    });

    console.log("Socket.IO initialized");
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initializeSocketIO first.");
    }
    return io;
};

export default { initializeSocketIO, getIO };