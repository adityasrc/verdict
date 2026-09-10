import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

export interface AuthData {
    user: User;
    accessToken: string;
    refreshToken: string;
}

interface StoredAuth {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
}

const getStoredAuth = (): StoredAuth => {
    try {
        const userStr = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const user = userStr ? (JSON.parse(userStr) as User) : null;
        return { user, accessToken, refreshToken };
    } catch {
        return { user: null, accessToken: null, refreshToken: null };
    }
};

const AUTH_CHANGE_EVENT = 'verdict-auth-change';

export const useAuth = () => {
    const [auth, setAuth] = useState<StoredAuth>(getStoredAuth);

    const syncAuth = useCallback(() => {
        setAuth(getStoredAuth());
    }, []);

    useEffect(() => {
        window.addEventListener(AUTH_CHANGE_EVENT, syncAuth);
        window.addEventListener('storage', syncAuth);
        return () => {
            window.removeEventListener(AUTH_CHANGE_EVENT, syncAuth);
            window.removeEventListener('storage', syncAuth);
        };
    }, [syncAuth]);

    const login = useCallback((data: AuthData) => {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setAuth({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuth({
            user: null,
            accessToken: null,
            refreshToken: null,
        });
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }, []);

    return {
        user: auth.user,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        isAuthenticated: !!auth.accessToken,
        login,
        logout,
    };
};
