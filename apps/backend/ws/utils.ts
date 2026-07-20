import { getIO } from "./socket.js";

export const sendNotificationToUser = (userId: string, notification: unknown) => {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", notification);
};

export const emitToRoom = (roomId: string, event: string, data: unknown) => {
    const io = getIO();
    io.to(roomId).emit(event, data);
};

export const broadcastSystemAlert = (event: string, data: unknown) => {
    const io = getIO();
    io.emit(event, data);
};

export const getConnectedSockets = async () => {
    const io = getIO();
    return await io.fetchSockets();
};

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