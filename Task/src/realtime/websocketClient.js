import { env } from '../lib/env.js';

export class RealtimeClient {
    constructor({ onStateChange, onMessage } = {}) {
        this.socket = null;
        this.retry = 0;
        this.timer = null;
        this.closedByClient = false;
        this.onStateChange = onStateChange || (() => { });
        this.onMessage = onMessage || (() => { });
    }

    connect() {
        if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
        this.closedByClient = false;
        this.onStateChange('connecting');
        this.socket = new WebSocket(env.wsUrl);
        this.socket.addEventListener('open', () => {
            this.retry = 0;
            this.onStateChange('open');
        });
        this.socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (typeof message.type === 'string') this.onMessage(message);
            } catch {
                this.onStateChange('error');
            }
        });
        this.socket.addEventListener('error', () => this.onStateChange('error'));
        this.socket.addEventListener('close', () => {
            this.onStateChange('closed');
            this.socket = null;
            if (!this.closedByClient) this.scheduleReconnect();
        });
    }

    send(type, data = {}) {
        if (this.socket?.readyState !== WebSocket.OPEN) return false;
        this.socket.send(JSON.stringify({ type, data }));
        return true;
    }

    scheduleReconnect() {
        if (this.timer) return;
        const delay = Math.min(1000 * (2 ** this.retry), 30000);
        this.retry += 1;
        this.timer = window.setTimeout(() => {
            this.timer = null;
            this.connect();
        }, delay);
    }

    close() {
        this.closedByClient = true;
        if (this.timer) window.clearTimeout(this.timer);
        this.timer = null;
        this.socket?.close();
        this.socket = null;
        this.onStateChange('closed');
    }
}