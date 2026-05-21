import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";

import { redis } from "../utils/redis.js"; 
import {
    notificationHandlers,
    submissionHandlers,
} from "./handlers.js";

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
            } catch (error) {
                console.error("Failed to parse message:", message);
            }
        }
    });

    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        
        submissionHandlers(socket);
        notificationHandlers(socket);

        socket.on("disconnect", () => {
            console.log(`Client disconnected: ${socket.id}`);
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