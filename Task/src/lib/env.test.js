import { describe, expect, it } from 'vitest';
import { resolveFrontendEnv } from './env.js';
import viteConfig from '../../vite.config.js';

describe('frontend environment configuration', () => {
    it('uses the local API and WebSocket endpoints when development env values are missing', () => {
        expect(resolveFrontendEnv({ MODE: 'development' })).toMatchObject({
            apiUrl: 'http://localhost:5000/api',
            wsUrl: 'ws://localhost:5000/ws',
            appEnv: 'development',
        });
    });

    it('runs the frontend on the origin allowed by the local backend', () => {
        expect(viteConfig.server).toMatchObject({
            port: 5174,
            strictPort: true,
        });
    });

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
