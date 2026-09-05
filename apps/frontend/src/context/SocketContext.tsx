import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { getWsUrl } from '../config';
import { selectAccessToken } from '../features/auth/authSlice';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    
    const token = useSelector(selectAccessToken);

    useEffect(() => {
        if (!token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const wsUrl = getWsUrl();
        const socketInstance = io(wsUrl, {
            withCredentials: true,
            transports: ['websocket'],
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
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};