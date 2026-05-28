import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsUrl } from '../config';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    // Use a ref so the effect doesn't re-run on every render
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Don't connect if there's no token — user is not logged in
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const wsUrl = getWsUrl();
        const socketInstance = io(wsUrl, {
            withCredentials: true,
            transports: ['websocket'],
            // Pass the JWT so the server can authenticate the connection
            auth: { token },
        });

        socketInstance.on('connect', () => {
            console.log('[Verdict] Socket connected.');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('[Verdict] Socket disconnected.');
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (err) => {
            console.error('[Verdict] Socket connection error:', err.message);
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
            socketRef.current = null;
        };
    }, []); // Only run once on mount — reconnect handled by socket.io internally

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};