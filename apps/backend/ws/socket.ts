import type { Server as HTTPServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";

import { redis } from "../utils/redis.js";
import { submissionHandlers } from "./handlers.js";

interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

let io: Server;

export const initSocket = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });


    const sub = redis.duplicate(); // second dedicated connection for listening

    sub.psubscribe("submission:*") // pattern subscribe for all submissions
        .then((count) => {
            console.log(
                `Subscribed to ${count} channels. Listening for updates on submission:*`,
            );
        })
        .catch((err: Error) => {
            console.error("Failed to subscribe: %s", err.message);
        });


    sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
        const submissionId = channel.split(":")[1];
        if (submissionId) {
            try {
                const event = JSON.parse(message);

                const eventWithId = { ...event, submissionId };

                io.to(submissionId).emit("submission-progress", eventWithId);

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

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${authedSocket.id}`);
        });
    });

    console.log("Socket.IO initialized");
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initSocket first.");
    }
    return io;
};

export default { initSocket, getIO };