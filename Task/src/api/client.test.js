import { describe, expect, it } from 'vitest';
import { apiClient } from './client.js';
import { env } from '../lib/env.js';

describe('API client configuration', () => {
    it('uses the configured API base URL and includes cookie credentials', () => {
        expect(apiClient.defaults.baseURL).toBe(env.apiUrl);
        expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('rejects requests clearly when a production API URL is missing', async () => {
        const configuredBaseUrl = apiClient.defaults.baseURL;
        apiClient.defaults.baseURL = '';

        try {
            await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
                code: 'API_NOT_CONFIGURED',
            });
        } finally {
            apiClient.defaults.baseURL = configuredBaseUrl;
        }
    });

    it('does not emit a global session-expired event for a stale session check', async () => {
        const configuredAdapter = apiClient.defaults.adapter;
        let expiredEvents = 0;
        const handleExpired = () => { expiredEvents += 1; };
        apiClient.defaults.adapter = async (config) => Promise.reject(Object.assign(new Error('Unauthorized'), {
            config,
            response: { status: 401, data: { message: 'Unauthorized' }, config },
        }));
        window.addEventListener('auth:expired', handleExpired);

        try {
            await expect(apiClient.get('/auth/me')).rejects.toMatchObject({ response: { status: 401 } });
            expect(expiredEvents).toBe(0);

            await expect(apiClient.get('/tasks')).rejects.toMatchObject({ response: { status: 401 } });
            expect(expiredEvents).toBe(1);
        } finally {
            window.removeEventListener('auth:expired', handleExpired);
            apiClient.defaults.adapter = configuredAdapter;
        }
    });
});
