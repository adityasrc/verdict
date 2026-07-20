import type { Socket } from "socket.io";
import { redis } from "../utils/redis.js";

interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

export const notificationHandlers = (socket: AuthenticatedSocket) => {
    socket.on("subscribe-notifications", (userId: string) => {
        if (userId !== socket.userId) {
            socket.emit("error", { message: "Cannot subscribe to another user's notifications" });
            return;
        }
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} subscribed to user:${userId}`);
    });

    socket.on("unsubscribe-notifications", (userId: string) => {
        if (userId !== socket.userId) {
            return;
        }
        socket.leave(`user:${userId}`);
        console.log(`Socket ${socket.id} unsubscribed from user:${userId}`);
    });
};

export const submissionHandlers = (socket: AuthenticatedSocket) => {
    socket.on("watch-submission", async (submissionId: string) => {
        socket.join(submissionId);
        console.log(`Socket ${socket.id} watching submission: ${submissionId}`);

        // Replay any events that were published before this socket joined.
        // This fixes the race condition where the worker starts processing
        // before the frontend has had a chance to join the room.
        try {
            const cachedEvents = await redis.lrange(`submission_events:${submissionId}`, 0, -1);
            for (const raw of cachedEvents) {
                try {
                    socket.emit("submission-progress", JSON.parse(raw));
                } catch {
                    // malformed cached event — skip
                }
            }
        } catch (err) {
            console.error(`Failed to replay cached events for ${submissionId}:`, err);
        }
    });

    socket.on("watch-assignment", (assignmentId: string) => {
        socket.join(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} watching assignment: ${assignmentId}`);
    });

    socket.on("unwatch-assignment", (assignmentId: string) => {
        socket.leave(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} stopped watching assignment: ${assignmentId}`);
    });
};