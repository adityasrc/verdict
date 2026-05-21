import { getIO } from "./socket.js";

// Send notification to a specific user
export const sendNotificationToUser = (userId: string, notification: unknown) => {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", notification);
};

// Generic event emitter for rooms (assignments/submissions)
export const emitToRoom = (roomId: string, event: string, data: unknown) => {
    const io = getIO();
    io.to(roomId).emit(event, data);
};

// Broadcast global system alerts
export const broadcastSystemAlert = (event: string, data: unknown) => {
    const io = getIO();
    io.emit(event, data);
};

// Admin/Analytics: Get all connected sockets
export const getConnectedSockets = async () => {
    const io = getIO();
    return await io.fetchSockets();
};

// Admin/Analytics: Get sockets in a specific room
export const getSocketsInRoom = async (roomId: string) => {
    const io = getIO();
    return await io.in(roomId).fetchSockets();
};

export default {
    sendNotificationToUser,
    emitToRoom,
    broadcastSystemAlert,
    getConnectedSockets,
    getSocketsInRoom,
};