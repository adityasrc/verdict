import type { Server as HTTPServer } from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { redis } from "../utils/redis.js";

export interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

let io: Server;

export const initSocket = (httpServer: HTTPServer): Server => {
    // setup socket.io server with cors
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // verify jwt token on initial connection
    io.use((rawSocket, next) => {
        const socket = rawSocket as AuthenticatedSocket;
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
            socket.userId = decoded.userId;
            socket.role = decoded.role;
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    // handle client connection, room join and replay cached events
    io.on("connection", (rawSocket) => {
        const socket = rawSocket as AuthenticatedSocket;

        socket.on("watch-submission", async (submissionId: string) => {
            socket.join(submissionId);

            try {
                const cachedEvents = await redis.lrange(`submission_events:${submissionId}`, 0, -1);
                for (const raw of cachedEvents) {
                    try {
                        const event = JSON.parse(raw);
                        socket.emit("submission-progress", { ...event, submissionId });
                    } catch {
                        // Ignore JSON parsing errors
                    }
                }
            } catch (err) {
                console.error(`Failed to replay events for ${submissionId}:`, err);
            }
        });

        socket.on("watch-assignment", (assignmentId: string) => {
            if (socket.role !== "TEACHER") return;
            socket.join(`assignment:${assignmentId}`);
        });

        socket.on("unwatch-assignment", (assignmentId: string) => {
            socket.leave(`assignment:${assignmentId}`);
        });
    });

    // listen to redis channels and forward events to matching rooms
    const sub = redis.duplicate();

    sub.on("error", (err: Error) => {
        console.warn("[Redis Sub] Connection error:", err.message);
    });

    sub.psubscribe("submission:*").catch((err: Error) => {
        console.error("Failed to subscribe to submission updates:", err.message);
    });

    sub.on("pmessage", (pattern: string, channel: string, message: string) => {
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

    return io;
};

// export socket instance helper
export const getIO = (): Server => {
    if (!io) {
        throw new Error("Socket.IO not initialized. Call initSocket first.");
    }
    return io;
};