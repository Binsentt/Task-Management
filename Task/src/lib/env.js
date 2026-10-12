function requireUrl(name) {
    const testDefaults = {
        VITE_API_URL: 'http://localhost:5000/api',
        VITE_WS_URL: 'ws://localhost:5000/ws'
    };
    const value = import.meta.env[name] || (import.meta.env.MODE === 'test' ? testDefaults[name] : undefined);
    if (!value) throw new Error(`Missing frontend environment variable: ${name}`);
    return value.replace(/\/$/, '');
}

export const env = Object.freeze({
    apiUrl: requireUrl('VITE_API_URL'),
    wsUrl: requireUrl('VITE_WS_URL'),
    appEnv: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development'
});