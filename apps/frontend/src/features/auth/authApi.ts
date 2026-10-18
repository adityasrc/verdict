import { apiClient } from '../../lib/apiClient';
import type { AuthResponse, LoginCredentials, RegisterData } from '../../types';

export const login = (credentials: LoginCredentials) =>
    apiClient<AuthResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
    });

export const signup = (data: RegisterData) =>
    apiClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: data,
    });

export const getCurrentUser = () =>
    apiClient<AuthResponse>('/auth/me');

export const authApi = {
    login,
    signup,
    getCurrentUser,
};