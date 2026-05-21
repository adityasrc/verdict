import type { Socket } from "socket.io";

// Core Pipeline: Notifications for assigned tasks or grading completion
export const notificationHandlers = (socket: Socket) => {
    socket.on("subscribe-notifications", (userId: string) => {
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} subscribed to user:${userId}`);
    });

    socket.on("unsubscribe-notifications", (userId: string) => {
        socket.leave(`user:${userId}`);
        console.log(`Socket ${socket.id} unsubscribed from user:${userId}`);
    });
};

// Core Pipeline: Real-time submission routing and AI grading progress
export const submissionHandlers = (socket: Socket) => {
    socket.on("watch-submission", (submissionId: string) => {
        socket.join(submissionId);
        console.log(`Socket ${socket.id} watching submission: ${submissionId}`);
    });

    // Teacher Dashboard: Watch all incoming submissions for an active assignment
    socket.on("watch-assignment", (assignmentId: string) => {
        socket.join(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} watching assignment: ${assignmentId}`);
    });

    socket.on("unwatch-assignment", (assignmentId: string) => {
        socket.leave(`assignment:${assignmentId}`);
        console.log(`Socket ${socket.id} stopped watching assignment: ${assignmentId}`);
    });
};