import type { Socket } from "socket.io";
import { redis } from "../utils/redis.js";

interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

export const submissionHandlers = (socket: AuthenticatedSocket) => {
    socket.on("watch-submission", async (submissionId: string) => {
        socket.join(submissionId);
        console.log(`Socket ${socket.id} watching submission: ${submissionId}`);

        // Replay any events that were published before this socket joined.
        try {
            const cachedEvents = await redis.lrange(`submission_events:${submissionId}`, 0, -1);
            for (const raw of cachedEvents) {
                try {
                    socket.emit("submission-progress", JSON.parse(raw));
                } catch {

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