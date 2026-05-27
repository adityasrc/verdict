import type { Socket } from "socket.io";

// This type is set on the socket after JWT auth in socket.ts
interface AuthenticatedSocket extends Socket {
    userId: string;
    role: string;
}

// Notifications — users can only subscribe to their own notification room
export const notificationHandlers = (socket: AuthenticatedSocket) => {
    socket.on("subscribe-notifications", (userId: string) => {
        // Prevent subscribing to another user's notifications
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

// Real-time submission and grading progress
export const submissionHandlers = (socket: AuthenticatedSocket) => {
    socket.on("watch-submission", (submissionId: string) => {
        socket.join(submissionId);
        console.log(`Socket ${socket.id} watching submission: ${submissionId}`);
    });

    // Teacher Dashboard: watch all submissions for a given assignment
    socket.on("watch-assignment", (assignmentId: string) => {
        socket.join(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} watching assignment: ${assignmentId}`);
    });

    socket.on("unwatch-assignment", (assignmentId: string) => {
        socket.leave(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} stopped watching assignment: ${assignmentId}`);
    });
};