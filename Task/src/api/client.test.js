import { describe, expect, it } from 'vitest';
import { apiClient } from './client.js';
import { env } from '../lib/env.js';

describe('API client configuration', () => {
    it('uses the configured API base URL and includes cookie credentials', () => {
        expect(apiClient.defaults.baseURL).toBe(env.apiUrl);
        expect(apiClient.defaults.withCredentials).toBe(true);
    });
});
