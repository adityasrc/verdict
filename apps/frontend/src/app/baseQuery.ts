import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiUrl } from '../config';
import { logout, setCredentials } from '../features/auth/authSlice';
import type { RootState } from './store';

// Module-level flags prevent multiple concurrent refresh requests.
// If three API calls all 401 at the same time, only ONE refresh is sent to the server.
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const baseQuery = fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken || localStorage.getItem('accessToken');
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
    // If another request is already refreshing the token, wait for it to finish
    // before sending this request. This avoids sending multiple /auth/refresh calls.
    if (isRefreshing && refreshPromise) {
        await refreshPromise;
    }

    let result = await baseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        if (!isRefreshing) {
            // We are the first request to hit a 401 — we "win" the right to refresh.
            isRefreshing = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // No refresh token stored — the user must log in again.
                api.dispatch(logout());
                return result;
            }

            // Store the refresh attempt as a shared promise so concurrent 401 requests
            // can all await the same single network call (see the else-if branch below).
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
                            const currentUser = (api.getState() as RootState).auth.user;
                            if (currentUser) {
                                // Store the new tokens so subsequent requests use them.
                                api.dispatch(
                                    setCredentials({
                                        user: currentUser,
                                        accessToken,
                                        // Use the rotated refresh token if the server issued one.
                                        refreshToken: newRefreshToken || refreshToken,
                                    })
                                );
                                return true;
                            }
                        }
                    }
                    // Refresh failed — force a full logout.
                    api.dispatch(logout());
                    return false;
                } catch {
                    api.dispatch(logout());
                    return false;
                } finally {
                    // Always reset the lock so future 401s can trigger a new refresh.
                    isRefreshing = false;
                    refreshPromise = null;
                }
            })();

            const success = await refreshPromise;
            if (success) {
                // Retry the original request with the new access token in headers.
                result = await baseQuery(args, api, extraOptions);
            }
        } else if (refreshPromise) {
            // Another request already started a refresh. Wait for it to finish,
            // then retry this request (prepareHeaders will now pick up the new token).
            await refreshPromise;
            result = await baseQuery(args, api, extraOptions);
        }
    }
    return result;
};