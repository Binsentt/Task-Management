import WebSocket, { WebSocketServer } from 'ws';
import User from '../modules/user/user.model.js';
import { heartbeat, getPresence, sendPing, respondToPing, expirePings } from '../modules/presence/presence.service.js';
import { pingSchema, pingResponseSchema } from '../modules/presence/presence.validation.js';
import { COOKIE_NAME, verifyToken } from '../utils/jwt.js';
import { isClientOriginAllowed } from '../config/clientOrigins.js';
import { onRealtimeEvent } from './events.js';

function getToken(request) {
    const cookie = request.headers.cookie
        ?.split(';')
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${COOKIE_NAME}=`));
    if (cookie) return decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1));
    const header = request.headers.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

async function authenticate(request) {
    let token;
    let payload;
    try {
        token = getToken(request);
        if (!token) return null;
        payload = verifyToken(token);
    } catch {
        return null;
    }

    const user = await User.findById(payload.sub);
    if (!user || (payload.ver ?? 0) !== (user.auth_version ?? 0) || !user.organization) return null;
    return { token, user, organizationId: user.organization.toString() };
}

function send(socket, type, data = null) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, data }));
}

function sameId(first, second) {
    return Boolean(first && second && first.toString() === second.toString());
}

function closeForAuthorization(client, code, reason) {
    if (client.authorizationClosing || client.socket.readyState !== WebSocket.OPEN) return;
    client.authorizationClosing = true;
    client.socket.close(code, reason);
}

async function refreshClientUser(client) {
    if (client.authorizationClosing) return { failure: 'invalid' };

    let payload;
    try {
        payload = verifyToken(client.token);
    } catch {
        return { failure: 'invalid' };
    }

    try {
        const user = await User.findById(payload.sub);
        if (
            !user
            || !user.organization
            || !sameId(payload.sub, client.userId)
            || (payload.ver ?? 0) !== (user.auth_version ?? 0)
            || !sameId(user.organization, client.organizationId)
        ) {
            return { failure: 'invalid' };
        }
        client.user = user;
        return { user };
    } catch {
        return { failure: 'unavailable' };
    }
}

async function broadcast(clients, organizationId, type, data) {
    await Promise.all([...clients].map(async (client) => {
        try {
            const authorization = await refreshClientUser(client);
            if (!authorization.user) {
                closeForAuthorization(
                    client,
                    authorization.failure === 'invalid' ? 1008 : 1011,
                    authorization.failure === 'invalid' ? 'Authorization no longer valid' : 'Authorization check unavailable'
                );
                return;
            }
            if (sameId(authorization.user.organization, organizationId)) {
                send(client.socket, type, data);
            }
        } catch {
            closeForAuthorization(client, 1011, 'Authorization check unavailable');
        }
    }));
}

async function handleMessage(client, raw, clients) {
    const authorization = await refreshClientUser(client);
    if (!authorization.user) {
        closeForAuthorization(
            client,
            authorization.failure === 'invalid' ? 1008 : 1011,
            authorization.failure === 'invalid' ? 'Authorization no longer valid' : 'Authorization check unavailable'
        );
        return;
    }

    const user = authorization.user;
    try {
        const message = JSON.parse(raw.toString());
        const type = message?.type;
        const data = message?.data || {};

        if (type === 'presence:heartbeat') {
            const result = await heartbeat(user);
            send(client.socket, 'presence:heartbeat_ack', result.data);
            await broadcast(clients, user.organization, 'presence:update', result.data);
        } else if (type === 'presence:ping') {
            const parsed = pingSchema.safeParse(data);
            if (!parsed.success) return send(client.socket, 'error', { message: 'Invalid ping payload' });
            const result = await sendPing(user, parsed.data.target_id);
            send(client.socket, 'presence:ping_ack', result.data);
            if (result.status === 201) await broadcast(clients, user.organization, 'presence:ping', result.data);
        } else if (type === 'presence:respond') {
            const parsed = pingResponseSchema.safeParse(data);
            if (!parsed.success) return send(client.socket, 'error', { message: 'Invalid response payload' });
            const result = await respondToPing(user, parsed.data.ping_id);
            send(client.socket, 'presence:respond_ack', result.data);
            if (result.status === 200) await broadcast(clients, user.organization, 'presence:ping_update', result.data);
        } else {
            send(client.socket, 'error', { message: 'Unknown realtime event' });
        }
    } catch {
        send(client.socket, 'error', { message: 'Invalid realtime message' });
    }
}

async function initializeClient(client, getPresenceSnapshot) {
    try {
        const authorization = await refreshClientUser(client);
        if (!authorization.user) {
            closeForAuthorization(
                client,
                authorization.failure === 'invalid' ? 1008 : 1011,
                authorization.failure === 'invalid' ? 'Authorization no longer valid' : 'Authorization check unavailable'
            );
            return;
        }

        const snapshot = await getPresenceSnapshot(authorization.user);
        if (snapshot.status !== 200) return;

        const currentAuthorization = await refreshClientUser(client);
        if (!currentAuthorization.user) {
            closeForAuthorization(
                client,
                currentAuthorization.failure === 'invalid' ? 1008 : 1011,
                currentAuthorization.failure === 'invalid' ? 'Authorization no longer valid' : 'Authorization check unavailable'
            );
            return;
        }
        send(client.socket, 'presence:snapshot', snapshot.data);
    } catch {
        send(client.socket, 'error', { message: 'Unable to load presence snapshot' });
        client.socket.close(1011, 'Presence snapshot unavailable');
    }
}

function rejectUpgrade(socket, status) {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
}

export function attachRealtime(server, {
    getPresenceSnapshot = getPresence,
} = {}) {
    const clients = new Set();
    const pendingSockets = new Set();
    const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
    const removeEventListener = onRealtimeEvent(({ organization, type, data }) => {
        void broadcast(clients, organization, type, data).catch(() => {});
    });

    let closing = false;
    let shutdownTimer;
    const onUpgrade = async (request, socket, head) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname !== '/ws') return rejectUpgrade(socket, '404 Not Found');
        if (closing) return rejectUpgrade(socket, '503 Service Unavailable');
        const origin = request.headers.origin;
        if (origin && !isClientOriginAllowed(origin)) return rejectUpgrade(socket, '403 Forbidden');

        const removePendingSocket = () => pendingSockets.delete(socket);
        pendingSockets.add(socket);
        socket.once('close', removePendingSocket);
        try {
            const session = await authenticate(request);
            if (closing || socket.destroyed) return;
            if (!session) return rejectUpgrade(socket, '401 Unauthorized');
            removePendingSocket();
            socket.removeListener('close', removePendingSocket);
            websocketServer.handleUpgrade(request, socket, head, (clientSocket) => {
                websocketServer.emit('connection', clientSocket, session);
            });
        } catch {
            if (!socket.destroyed) rejectUpgrade(socket, '503 Service Unavailable');
        } finally {
            removePendingSocket();
            socket.removeListener('close', removePendingSocket);
        }
    };
    server.on('upgrade', onUpgrade);

    websocketServer.on('connection', (socket, session) => {
        const client = {
            socket,
            token: session.token,
            user: session.user,
            userId: session.user._id.toString(),
            organizationId: session.organizationId,
            authorizationClosing: false,
        };
        clients.add(client);

        socket.on('message', (raw) => {
            void handleMessage(client, raw, clients).catch(() => {
                closeForAuthorization(client, 1011, 'Realtime request unavailable');
            });
        });

        const removeClient = () => {
            clients.delete(client);
            if (closing && clients.size === 0) clearTimeout(shutdownTimer);
        };
        socket.on('close', removeClient);
        socket.on('error', removeClient);

        void initializeClient(client, getPresenceSnapshot).catch(() => {
            closeForAuthorization(client, 1011, 'Presence snapshot unavailable');
        });
    });

    const expiryTimer = setInterval(async () => {
        const organizations = new Set(
            [...clients]
            .map((client) => client.user.organization?.toString())
                .filter(Boolean)
        );
        for (const organization of organizations) {
            try {
                const expired = await expirePings(organization);
                for (const ping of expired) await broadcast(clients, organization, 'presence:ping_update', ping);
            } catch {
                // A temporary database failure must not become an unhandled timer rejection.
            }
        }
    }, 1000);
    expiryTimer.unref();

    return {
        close() {
            if (closing) return;
            closing = true;
            clearInterval(expiryTimer);
            removeEventListener();
            server.removeListener('upgrade', onUpgrade);
            for (const socket of pendingSockets) socket.destroy();
            pendingSockets.clear();
            for (const client of clients) client.socket.close(1001, 'Server shutting down');
            websocketServer.close();
            if (clients.size > 0) {
                shutdownTimer = setTimeout(() => {
                    for (const client of clients) client.socket.terminate();
                }, 1000);
                shutdownTimer.unref();
            }
        }
    };
}
