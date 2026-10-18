export const getApiUrl = (): string =>
    import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getWsUrl = (): string =>
    import.meta.env.VITE_WS_URL || 'http://localhost:4000';
