import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import WebSocket from 'ws';

process.env.CLIENT_URL = 'http://localhost:5174';
process.env.CORS_ORIGINS = 'http://localhost:5173, http://localhost:4173';

const { default: app } = await import('../src/app.js');
const { attachRealtime } = await import('../src/realtime/websocket.js');

async function startServer() {
    const server = http.createServer(app);
    const realtime = attachRealtime(server);
    await new Promise((resolve) => server.listen(0, resolve));
    return { server, realtime, port: server.address().port };
}

async function stopServer({ server, realtime }) {
    realtime.close();
    await new Promise((resolve) => server.close(resolve));
}

function websocketResult(port, origin) {
    return new Promise((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
            headers: origin ? { Origin: origin } : {},
        });
        socket.once('open', () => resolve('opened'));
        socket.once('error', (error) => resolve(error.message));
    });
}

test('allows explicitly configured frontend origins with credentials on session checks', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/auth/me`, {
            headers: { Origin: 'http://localhost:5173' },
        });

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
        assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    } finally {
        await stopServer(context);
    }
});

test('keeps the primary CLIENT_URL origin backward-compatible', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/auth/me`, {
            headers: { Origin: 'http://localhost:5174' },
        });

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174');
        assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    } finally {
        await stopServer(context);
    }
});

test('uses the HTTP allowlist for WebSocket upgrades', async () => {
    const context = await startServer();
    try {
        for (const origin of [
            'http://localhost:5173',
            'http://localhost:4173',
            'http://localhost:5174',
        ]) {
            const result = await websocketResult(context.port, origin);
            assert.match(result, /Unexpected server response: 401/, origin);
        }

        const denied = await websocketResult(context.port, 'http://localhost:9000');
        assert.match(denied, /Unexpected server response: 403/);
    } finally {
        await stopServer(context);
    }
});

test('serves requests without an Origin header', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/auth/me`);

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('access-control-allow-origin'), null);
    } finally {
        await stopServer(context);
    }
});

test('does not reflect an unconfigured origin when credentials are enabled', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/auth/me`, {
            headers: { Origin: 'http://localhost:9000' },
        });

        assert.equal(response.status, 401);
        assert.equal(response.headers.get('access-control-allow-origin'), null);
        assert.equal(response.headers.get('access-control-allow-credentials'), null);
    } finally {
        await stopServer(context);
    }
});
