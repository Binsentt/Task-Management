import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../src/modules/user/user.model.js';
import Presence, { PresencePing } from '../src/modules/presence/presence.model.js';
import { signToken } from '../src/utils/jwt.js';
import { attachRealtime } from '../src/realtime/websocket.js';
import { emitRealtimeEvent } from '../src/realtime/events.js';

process.env.JWT_SECRET = 'websocket-test-secret-long-enough-for-the-app';

const userId = new mongoose.Types.ObjectId();
const organizationId = new mongoose.Types.ObjectId();

function makeUser(authVersion = 0) {
    return {
        _id: userId,
        auth_version: authVersion,
        organization: organizationId,
        org_role: 'MANAGER',
    };
}

async function startRealtime(options) {
    const server = http.createServer();
    const openSockets = new Set();
    server.on('connection', (socket) => {
        openSockets.add(socket);
        socket.once('close', () => openSockets.delete(socket));
    });
    const realtime = attachRealtime(server, options);
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return { server, realtime, openSockets, port: server.address().port };
}

async function stopRealtime(context, sockets = []) {
    for (const socket of sockets) socket.terminate();
    context.realtime.close();
    for (const socket of context.openSockets) socket.destroy();
    if (context.server.listening) {
        await new Promise((resolve) => context.server.close(resolve));
    }
}

function websocketStatus(port, token, timeoutMs = 600) {
    return new Promise((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        let settled = false;
        const finish = (status) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({ status, socket });
        };
        const timer = setTimeout(() => {
            socket.terminate();
            finish(null);
        }, timeoutMs);

        socket.once('open', () => {
            socket.close();
            finish(101);
        });
        socket.once('unexpected-response', (request, response) => {
            const status = response.statusCode;
            response.resume();
            socket.terminate();
            finish(status);
        });
        socket.once('error', () => {});
    });
}

function installPresenceReadMocks(user = makeUser()) {
    const originalFind = User.find;
    const originalPresenceFind = Presence.find;
    User.find = () => ({
        select() { return this; },
        sort() { return this; },
        async lean() {
            return [{ _id: user._id, username: 'tester', email: 'tester@example.invalid', org_role: 'MANAGER' }];
        },
    });
    Presence.find = () => ({ async lean() { return []; } });
    return () => {
        User.find = originalFind;
        Presence.find = originalPresenceFind;
    };
}

function observeUnhandledRejections() {
    const reasons = [];
    const listener = (reason) => reasons.push(reason);
    process.on('unhandledRejection', listener);
    return {
        reasons,
        stop() { process.off('unhandledRejection', listener); },
    };
}

function connectSocket(port, token) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    socket.on('error', () => {});
    const opened = new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    return { socket, opened };
}

function waitForSocketClose(socket, timeoutMs = 800) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off('close', onClose);
            reject(new Error('websocket did not close'));
        }, timeoutMs);
        const onClose = (code) => {
            clearTimeout(timer);
            resolve(code);
        };
        socket.once('close', onClose);
    });
}

function waitForMessage(socket, predicate, timeoutMs = 800) {
    return new Promise((resolve, reject) => {
        const onMessage = (raw) => {
            const message = JSON.parse(raw.toString());
            if (!predicate(message)) return;
            clearTimeout(timer);
            socket.off('message', onMessage);
            resolve(message);
        };
        const timer = setTimeout(() => {
            socket.off('message', onMessage);
            reject(new Error('expected websocket message was not received'));
        }, timeoutMs);
        socket.on('message', onMessage);
    });
}

async function openAndWaitForSnapshot(port, token) {
    const { socket, opened } = connectSocket(port, token);
    const snapshot = waitForMessage(socket, (message) => message.type === 'presence:snapshot');
    await opened;
    await snapshot;
    return socket;
}

test('returns 503 when the user lookup fails without an unhandled rejection', async () => {
    const originalFindById = User.findById;
    User.findById = () => Promise.reject(new Error('database unavailable'));
    const unhandled = observeUnhandledRejections();
    let context;
    try {
        context = await startRealtime();
        const result = await websocketStatus(context.port, signToken(userId));
        assert.equal(result.status, 503);
        assert.deepEqual(unhandled.reasons, []);
    } finally {
        unhandled.stop();
        User.findById = originalFindById;
        if (context) await stopRealtime(context);
    }
});

test('rejects a token whose auth_version has been revoked', async () => {
    const originalFindById = User.findById;
    const user = makeUser(2);
    User.findById = async () => user;
    const restorePresenceMocks = installPresenceReadMocks(user);
    let context;
    try {
        context = await startRealtime();
        const result = await websocketStatus(context.port, signToken(userId, 1));
        assert.equal(result.status, 401);
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context);
    }
});

test('catches a rejected presence snapshot and sends a safe error', async () => {
    const originalFindById = User.findById;
    const user = makeUser(0);
    User.findById = async () => user;
    const restorePresenceMocks = installPresenceReadMocks(user);
    let context;
    let socket;
    try {
        context = await startRealtime({
            getPresenceSnapshot: async () => { throw new Error('private database details'); },
        });
        socket = new WebSocket(`ws://127.0.0.1:${context.port}/ws`, {
            headers: { Authorization: `Bearer ${signToken(userId)}` },
        });
        socket.on('error', () => {});
        const message = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('no snapshot error message received')), 600);
            socket.once('message', (raw) => {
                clearTimeout(timer);
                resolve(JSON.parse(raw.toString()));
            });
        });
        await new Promise((resolve, reject) => {
            socket.once('open', resolve);
            socket.once('error', reject);
        });
        assert.deepEqual(await message, {
            type: 'error',
            data: { message: 'Unable to load presence snapshot' },
        });
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('catches expiry timer database failures without an unhandled rejection', async () => {
    const originalFindById = User.findById;
    const originalPingFind = PresencePing.find;
    const user = makeUser(0);
    User.findById = async () => user;
    PresencePing.find = () => Promise.reject(new Error('private database details'));
    const restorePresenceMocks = installPresenceReadMocks(user);
    const unhandled = observeUnhandledRejections();
    let context;
    let socket;
    try {
        context = await startRealtime();
        socket = new WebSocket(`ws://127.0.0.1:${context.port}/ws`, {
            headers: { Authorization: `Bearer ${signToken(userId)}` },
        });
        socket.on('error', () => {});
        await new Promise((resolve, reject) => {
            socket.once('open', resolve);
            socket.once('error', reject);
        });
        await new Promise((resolve) => setTimeout(resolve, 1100));
        assert.deepEqual(unhandled.reasons, []);
    } finally {
        unhandled.stop();
        User.findById = originalFindById;
        PresencePing.find = originalPingFind;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('removes the upgrade listener and closes pending and connected sockets', async () => {
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    User.findById = (id) => id === userId.toString()
        ? Promise.resolve(makeUser(0))
        : new Promise(() => {});
    let context;
    const sockets = [];
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        const connected = new WebSocket(`ws://127.0.0.1:${context.port}/ws`, {
            headers: { Authorization: `Bearer ${signToken(userId)}` },
        });
        const pending = new WebSocket(`ws://127.0.0.1:${context.port}/ws`, {
            headers: { Authorization: `Bearer ${signToken(new mongoose.Types.ObjectId())}` },
        });
        sockets.push(connected, pending);
        for (const socket of sockets) socket.on('error', () => {});
        await new Promise((resolve, reject) => {
            connected.once('open', resolve);
            connected.once('error', reject);
        });
        await new Promise((resolve) => setTimeout(resolve, 30));

        context.realtime.close();
        assert.equal(context.server.listenerCount('upgrade'), 0);
        const closed = await Promise.all(sockets.map((socket) => Promise.race([
            new Promise((resolve) => socket.once('close', () => resolve(true))),
            new Promise((resolve) => setTimeout(() => resolve(false), 500)),
        ])));
        assert.deepEqual(closed, [true, true]);
        const serverClosed = await Promise.race([
            new Promise((resolve) => context.server.close(() => resolve(true))),
            new Promise((resolve) => setTimeout(() => resolve(false), 500)),
        ]);
        assert.equal(serverClosed, true);
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, sockets);
    }
});

test('does not broadcast to a client whose organization membership was removed', async () => {
    const recipientId = new mongoose.Types.ObjectId();
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    let removed = false;
    User.findById = async (id) => {
        if (id === recipientId.toString()) return removed ? null : { ...makeUser(), _id: recipientId };
        return null;
    };
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(recipientId));

        let receivedBroadcast = false;
        socket.on('message', (raw) => {
            if (JSON.parse(raw.toString()).type === 'tasks:update') receivedBroadcast = true;
        });
        const closed = waitForSocketClose(socket);
        removed = true;
        emitRealtimeEvent(organizationId, 'tasks:update', { taskId: 'private-task' });

        assert.equal(await closed, 1008);
        assert.equal(receivedBroadcast, false);
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('uses the current role before processing a presence ping', async () => {
    const targetId = new mongoose.Types.ObjectId();
    const originalFindById = User.findById;
    const originalFindOne = User.findOne;
    const originalCreate = PresencePing.create;
    const restorePresenceMocks = installPresenceReadMocks();
    let currentUser = makeUser(0);
    let pingCreateCalls = 0;
    User.findById = async () => currentUser;
    User.findOne = async () => ({ _id: targetId });
    PresencePing.create = async (ping) => {
        pingCreateCalls += 1;
        return { ...ping, _id: new mongoose.Types.ObjectId() };
    };
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(userId));
        currentUser = { ...makeUser(0), org_role: 'MEMBER' };

        const acknowledgement = waitForMessage(socket, (message) => message.type === 'presence:ping_ack');
        socket.send(JSON.stringify({ type: 'presence:ping', data: { target_id: targetId.toString() } }));

        assert.equal((await acknowledgement).data, null);
        assert.equal(pingCreateCalls, 0);
    } finally {
        User.findById = originalFindById;
        User.findOne = originalFindOne;
        PresencePing.create = originalCreate;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('closes an established socket after its auth version is revoked', async () => {
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    let currentUser = makeUser(0);
    User.findById = async () => currentUser;
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(userId));
        currentUser = makeUser(1);

        const closed = waitForSocketClose(socket);
        socket.send(JSON.stringify({ type: 'unknown:event' }));
        assert.equal(await closed, 1008);
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('closes an established socket after its organization changes', async () => {
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    let currentUser = makeUser(0);
    User.findById = async () => currentUser;
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(userId));
        currentUser = { ...makeUser(0), organization: new mongoose.Types.ObjectId() };

        const closed = waitForSocketClose(socket);
        socket.send(JSON.stringify({ type: 'unknown:event' }));
        assert.equal(await closed, 1008);
    } finally {
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('rejects messages sent after the websocket token expires', async () => {
    const originalFindById = User.findById;
    const originalPingFind = PresencePing.find;
    const restorePresenceMocks = installPresenceReadMocks();
    PresencePing.find = async () => [];
    User.findById = async () => makeUser(0);
    const token = jwt.sign({
        sub: userId.toString(),
        ver: 0,
        exp: Math.floor(Date.now() / 1000) + 2,
    }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, token);
        const claims = jwt.decode(token);
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, claims.exp * 1000 - Date.now() + 50)));

        const closed = waitForSocketClose(socket);
        socket.send(JSON.stringify({ type: 'unknown:event' }));
        assert.equal(await closed, 1008);
    } finally {
        User.findById = originalFindById;
        PresencePing.find = originalPingFind;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('catches revalidation database failures during a message without an unhandled rejection', async () => {
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    let failLookup = false;
    User.findById = async () => {
        if (failLookup) throw new Error('private database details');
        return makeUser(0);
    };
    const unhandled = observeUnhandledRejections();
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(userId));
        failLookup = true;

        const closed = waitForSocketClose(socket);
        socket.send(JSON.stringify({ type: 'unknown:event' }));
        assert.equal(await closed, 1011);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(unhandled.reasons, []);
    } finally {
        unhandled.stop();
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});

test('catches revalidation database failures during broadcasts without an unhandled rejection', async () => {
    const originalFindById = User.findById;
    const restorePresenceMocks = installPresenceReadMocks();
    let failLookup = false;
    User.findById = async () => {
        if (failLookup) throw new Error('private database details');
        return makeUser(0);
    };
    const unhandled = observeUnhandledRejections();
    let context;
    let socket;
    try {
        context = await startRealtime({ getPresenceSnapshot: async () => ({ status: 200, data: [] }) });
        socket = await openAndWaitForSnapshot(context.port, signToken(userId));
        failLookup = true;

        const closed = waitForSocketClose(socket);
        emitRealtimeEvent(organizationId, 'tasks:update', { taskId: 'private-task' });
        assert.equal(await closed, 1011);
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(unhandled.reasons, []);
    } finally {
        unhandled.stop();
        User.findById = originalFindById;
        restorePresenceMocks();
        if (context) await stopRealtime(context, socket ? [socket] : []);
    }
});
