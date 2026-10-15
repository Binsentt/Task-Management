const localDefaults = {
    VITE_API_URL: 'http://localhost:5000/api',
    VITE_WS_URL: 'ws://localhost:5000/ws',
};

function resolveUrl(name, environment) {
    const value = environment[name]
        || (['development', 'test'].includes(environment.MODE) ? localDefaults[name] : undefined);
    const normalized = typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
    return normalized || null;
}

export function resolveFrontendEnv(environment) {
    const proxyApi = environment.MODE === 'production' && environment.VITE_DIRECT_API !== 'true';
    return Object.freeze({
        apiUrl: proxyApi ? '/api' : resolveUrl('VITE_API_URL', environment),
        wsUrl: proxyApi ? '/ws' : resolveUrl('VITE_WS_URL', environment),
        appEnv: environment.VITE_APP_ENV || environment.MODE || 'development',
    });
}

export const env = resolveFrontendEnv(import.meta.env);
