import { describe, expect, it } from 'vitest';
import { resolveFrontendEnv } from './env.js';

describe('frontend environment configuration', () => {
    it('does not throw during startup when production API URLs are missing', () => {
        expect(() => resolveFrontendEnv({ MODE: 'production' })).not.toThrow();
        expect(resolveFrontendEnv({ MODE: 'production' })).toMatchObject({
            apiUrl: null,
            wsUrl: null,
            appEnv: 'production',
        });
    });

    it('normalizes configured API and WebSocket URLs', () => {
        expect(resolveFrontendEnv({
            MODE: 'production',
            VITE_API_URL: 'https://api.example.com/api/',
            VITE_WS_URL: 'wss://api.example.com/ws/',
        })).toMatchObject({
            apiUrl: 'https://api.example.com/api',
            wsUrl: 'wss://api.example.com/ws',
            appEnv: 'production',
        });
    });
});
