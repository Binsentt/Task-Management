import { EventEmitter } from 'node:events';

const realtimeEvents = new EventEmitter();

export function emitRealtimeEvent(organization, type, data) {
    realtimeEvents.emit('event', { organization: organization.toString(), type, data });
}

export function onRealtimeEvent(listener) {
    realtimeEvents.on('event', listener);
    return () => realtimeEvents.off('event', listener);
}