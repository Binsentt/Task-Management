import * as presenceService from './presence.service.js';

const send = (res, result) => res.status(result.status).json(result);

export async function heartbeat(req, res) {
    return send(res, await presenceService.heartbeat(req.user));
}

export async function getPresence(req, res) {
    return send(res, await presenceService.getPresence(req.user));
}

export async function sendPing(req, res) {
    return send(res, await presenceService.sendPing(req.user, req.body.target_id));
}

export async function respondToPing(req, res) {
    return send(res, await presenceService.respondToPing(req.user, req.params.pingId));
}

export async function getPings(req, res) {
    return send(res, await presenceService.getPings(req.user));
}