import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../config';

const AUTH_CHANGE_EVENT = 'verdict-auth-change';

const clearAuthStorage = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
};

// Mutex lock to prevent multiple concurrent token refresh requests
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const baseQuery = fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

export const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // If another request is currently refreshing the token, wait for it first
    if (isRefreshing && refreshPromise) {
        await refreshPromise;
    }

    let result = await baseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                clearAuthStorage();
                return result;
            }

            refreshPromise = (async () => {
                try {
                    const refreshResult = await baseQuery(
                        {
                            url: '/auth/refresh',
                            method: 'POST',
                            body: { refreshToken },
                        },
                        api,
                        extraOptions
                    );

                    if (refreshResult.data) {
                        const data = refreshResult.data as {
                            data?: { accessToken?: string; refreshToken?: string };
                        };
                        const { accessToken, refreshToken: newRefreshToken } = data.data || {};

                        if (accessToken) {
                            localStorage.setItem('accessToken', accessToken);
                            if (newRefreshToken) {
                                localStorage.setItem('refreshToken', newRefreshToken);
                            }
                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
                            }
                            return true;
                        }
                    }

                    clearAuthStorage();
                    return false;
                } catch {
                    clearAuthStorage();
                    return false;
                } finally {
                    isRefreshing = false;
                    refreshPromise = null;
                }
            })();

            const success = await refreshPromise;
            if (success) {
                result = await baseQuery(args, api, extraOptions);
            }
        } else if (refreshPromise) {
            // Another request triggered the refresh; wait for it, then retry
            await refreshPromise;
            result = await baseQuery(args, api, extraOptions);
        }
    }
    return result;
};