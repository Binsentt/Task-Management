import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import WebSocket from 'ws';
import app from '../src/app.js';
import { attachRealtime } from '../src/realtime/websocket.js';

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

test('health endpoint responds without authentication', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/api/health`);
        assert.equal(response.status, 200);
    } finally {
        await stopServer(context);
    }
});

test('protected REST routes reject anonymous requests', async () => {
    const context = await startServer();
    try {
        const paths = ['/api/tasks', '/api/users/me', '/api/organizations/me', '/api/presence', '/api/shifts'];
        for (const path of paths) {
            const response = await fetch(`http://127.0.0.1:${context.port}${path}`);
            assert.equal(response.status, 401, path);
        }
    } finally {
        await stopServer(context);
    }
});

test('unknown HTTP routes return 404', async () => {
    const context = await startServer();
    try {
        const response = await fetch(`http://127.0.0.1:${context.port}/students/booger1`);
        assert.equal(response.status, 404);
    } finally {
        await stopServer(context);
    }
});

test('anonymous WebSocket upgrades are rejected', async () => {
    const context = await startServer();
    try {
        const result = await new Promise((resolve) => {
            const socket = new WebSocket(`ws://127.0.0.1:${context.port}/ws`);
            socket.once('open', () => resolve('opened'));
            socket.once('error', (error) => resolve(error.message));
        });
        assert.match(result, /Unexpected server response: 401/);
    } finally {
        await stopServer(context);
    }
});