import { getApiUrl } from '../config';

// omit default body and header and add custom one's
type Options = Omit<RequestInit, 'body' | 'headers'> & {
    headers?: Record<string, string>;
    body?: object | FormData;
};

export async function apiClient<T = unknown>(endpoint: string, options: Options = {}): Promise<T> {

    // construct full url
    const url = getApiUrl() + endpoint;

    // copy custom headers
    const headers: Record<string, string> = { ...options.headers };

    // attach token to headers
    const token = localStorage.getItem('accessToken');
    if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    let body: string | undefined;
    if (options.body) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
    }


    const response = await fetch(url, { ...options, headers, body });

    // in case user is unauthorized
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}
