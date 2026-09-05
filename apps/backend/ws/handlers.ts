import { redis } from "../utils/redis.js";
import type { AuthenticatedSocket } from "./socket.js";

export const submissionHandlers = (socket: AuthenticatedSocket) => {
    socket.on("watch-submission", async (submissionId: string) => {
        socket.join(submissionId);

        // replay past events if client joined late or refreshed
        try {
            const cachedEvents = await redis.lrange(`submission_events:${submissionId}`, 0, -1);
            for (const raw of cachedEvents) {
                try {
                    const event = JSON.parse(raw);
                    socket.emit("submission-progress", { ...event, submissionId });
                } catch {}
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
};