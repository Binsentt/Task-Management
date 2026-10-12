import * as userService from './user.service.js';

const send = (res, result) => res.status(result.status).json(result);

export async function getProfile(req, res) {
    return send(res, await userService.getProfile(req.user));
}

export async function updateProfile(req, res) {
    return send(res, await userService.updateProfile(req.user, req.body));
}

export async function getOrganizationMembers(req, res) {
    return send(res, await userService.getOrganizationMembers(req.user));
}

