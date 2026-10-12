import axios from 'axios';
import { env } from '../lib/env.js';

export const apiClient = axios.create({
    baseURL: env.apiUrl,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000
});

export function normalizeApiError(error) {
    const response = error.response;
    return {
        status: response?.status || 0,
        message: response?.data?.message || error.message || 'Request failed',
        errors: response?.data?.errors || []
    };
}

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
        if (error.response?.status === 401 && !isAuthRequest) {
            window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        return Promise.reject(error);
    }
);