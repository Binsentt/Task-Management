import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from 'node:http';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { startBackend } from '../src/runtime.js';

function listen(server, port = 0, host = '0.0.0.0') {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.off('error', reject);
            resolve(server.address());
        });
    });
}

function close(server) {
    if (!server.listening) return Promise.resolve();
    return new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
}

test('waits for the injected connector, listens on an ephemeral wildcard port, and stops idempotently', async () => {
    let resolveConnect;
    let connectCalls = 0;
    let disconnectCalls = 0;
    let startupSettled = false;
    let backend;
    let createdServer;
    const connectGate = new Promise((resolve) => {
        resolveConnect = resolve;
    });
    const originalCreateServer = http.createServer;
    http.createServer = (...args) => {
        createdServer = originalCreateServer(...args);
        return createdServer;
    };
    syncBuiltinESMExports();

    const startup = startBackend({
        port: 0,
        connect: () => {
            connectCalls += 1;
            return connectGate;
        },
        disconnect: async () => {
            disconnectCalls += 1;
        },
    });
    startup.then(
        () => { startupSettled = true; },
        () => { startupSettled = true; },
    );

    try {
        assert.equal(connectCalls, 1);
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(startupSettled, false, 'startup must remain pending while the connector is pending');
        assert.equal(createdServer, undefined, 'the HTTP listener must not be created before the connector resolves');

        resolveConnect();
        backend = await startup;
        assert.strictEqual(createdServer, backend.server);
        assert.equal(backend.server.listening, true);
        assert.equal(backend.server.address().address, '0.0.0.0');
        assert.ok(backend.server.address().port > 0);

        const stopPromise = backend.stop();
        assert.strictEqual(backend.stop(), stopPromise, 'repeated stop calls should share the same shutdown');
        await stopPromise;

        assert.equal(disconnectCalls, 1);
        assert.equal(backend.server.listening, false);
    } finally {
        resolveConnect();
        if (!backend) {
            try {
                backend = await startup;
            } catch {
                // The assertion or startup may have failed before a backend was returned.
            }
        }
        if (backend?.server.listening) await backend.stop();
        http.createServer = originalCreateServer;
        syncBuiltinESMExports();
    }
});

test('disconnects after the injected connector rejects', async () => {
    const connectionError = new Error('injected connection failure');
    let disconnectCalls = 0;

    await assert.rejects(
        startBackend({
            port: 0,
            connect: async () => { throw connectionError; },
            disconnect: async () => { disconnectCalls += 1; },
        }),
        (error) => error === connectionError,
    );

    assert.equal(disconnectCalls, 1);
});

test('disconnects when binding the requested port fails', async () => {
    const occupiedServer = createServer((request, response) => {
        response.writeHead(204);
        response.end();
    });
    const address = await listen(occupiedServer);
    let connectCalls = 0;
    let disconnectCalls = 0;

    try {
        await assert.rejects(
            startBackend({
                port: address.port,
                host: '0.0.0.0',
                connect: async () => { connectCalls += 1; },
                disconnect: async () => { disconnectCalls += 1; },
            }),
            (error) => error.code === 'EADDRINUSE',
        );

        assert.equal(connectCalls, 1);
        assert.equal(disconnectCalls, 1);
        assert.equal(occupiedServer.listening, true);
    } finally {
        await close(occupiedServer);
    }
});
