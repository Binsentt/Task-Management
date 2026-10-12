import WebSocket, { WebSocketServer } from 'ws';
import User from '../modules/user/user.model.js';
import { heartbeat, getPresence, sendPing, respondToPing, expirePings } from '../modules/presence/presence.service.js';
import { pingSchema, pingResponseSchema } from '../modules/presence/presence.validation.js';
import { COOKIE_NAME, verifyToken } from '../utils/jwt.js';
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
    try {
        const token = getToken(request);
        if (!token) return null;
        const payload = verifyToken(token);
        return User.findById(payload.sub);
    } catch {
        return null;
    }
}

function send(socket, type, data = null) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, data }));
}

function broadcast(clients, organizationId, type, data) {
    for (const client of clients) {
        if (client.user.organization?.equals(organizationId)) send(client.socket, type, data);
    }
}

function rejectUpgrade(socket, status) {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
}

export function attachRealtime(server) {
    const clients = new Set();
    const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
    const removeEventListener = onRealtimeEvent(({ organization, type, data }) => {
        broadcast(clients, organization, type, data);
    });

    server.on('upgrade', async (request, socket, head) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname !== '/ws') return rejectUpgrade(socket, '404 Not Found');
        const user = await authenticate(request);
        if (!user || !user.organization) return rejectUpgrade(socket, '401 Unauthorized');
        websocketServer.handleUpgrade(request, socket, head, (clientSocket) => {
            websocketServer.emit('connection', clientSocket, user);
        });
    });

    websocketServer.on('connection', async (socket, user) => {
        const client = { socket, user };
        clients.add(client);

        socket.on('message', async (raw) => {
            try {
                const message = JSON.parse(raw.toString());
                const type = message?.type;
                const data = message?.data || {};

                if (type === 'presence:heartbeat') {
                    const result = await heartbeat(user);
                    send(socket, 'presence:heartbeat_ack', result.data);
                    broadcast(clients, user.organization, 'presence:update', result.data);
                } else if (type === 'presence:ping') {
                    const parsed = pingSchema.safeParse(data);
                    if (!parsed.success) return send(socket, 'error', { message: 'Invalid ping payload' });
                    const result = await sendPing(user, parsed.data.target_id);
                    send(socket, 'presence:ping_ack', result.data);
                    if (result.status === 201) broadcast(clients, user.organization, 'presence:ping', result.data);
                } else if (type === 'presence:respond') {
                    const parsed = pingResponseSchema.safeParse(data);
                    if (!parsed.success) return send(socket, 'error', { message: 'Invalid response payload' });
                    const result = await respondToPing(user, parsed.data.ping_id);
                    send(socket, 'presence:respond_ack', result.data);
                    if (result.status === 200) broadcast(clients, user.organization, 'presence:ping_update', result.data);
                } else {
                    send(socket, 'error', { message: 'Unknown realtime event' });
                }
            } catch {
                send(socket, 'error', { message: 'Invalid realtime message' });
            }
        });

        socket.on('close', () => clients.delete(client));
        socket.on('error', () => clients.delete(client));

        const snapshot = await getPresence(user);
        if (snapshot.status === 200) send(socket, 'presence:snapshot', snapshot.data);
    });

    const expiryTimer = setInterval(async () => {
        const organizations = new Set(
            [...clients]
                .map((client) => client.user.organization?.toString())
                .filter(Boolean)
        );
        for (const organization of organizations) {
            const expired = await expirePings(organization);
            for (const ping of expired) broadcast(clients, organization, 'presence:ping_update', ping);
        }
    }, 1000);
    expiryTimer.unref();

    return {
        close() {
            clearInterval(expiryTimer);
            removeEventListener();
            for (const client of clients) client.socket.close();
            websocketServer.close();
        }
    };
}