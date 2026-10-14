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
});
