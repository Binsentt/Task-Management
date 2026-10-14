import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

process.env.CLIENT_URL = 'http://localhost:5174';
process.env.CORS_ORIGINS = 'http://localhost:5173, http://localhost:4173';

const { default: app } = await import('../src/app.js');

async function startServer() {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    return { server, port: server.address().port };
}

async function stopServer({ server }) {
    await new Promise((resolve) => server.close(resolve));
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
        const response = await fetch(`http://127.0.0.1:${context.port}/api/health`, {
            headers: { Origin: 'http://localhost:5174' },
        });

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174');
        assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    } finally {
        await stopServer(context);
    }
});

test('serves requests without an Origin header', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/health`);

        assert.equal(response.status, 200);
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
