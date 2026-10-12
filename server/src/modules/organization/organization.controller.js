import * as organizationService from './organization.service.js';

const send = (res, result) => res.status(result.status).json(result);

export async function getCurrent(req, res) {
    return send(res, await organizationService.getCurrent(req.user));
}

export async function createOrganization(req, res) {
    return send(res, await organizationService.createOrganization(req.user, req.body));
}

export async function joinOrganization(req, res) {
    return send(res, await organizationService.joinOrganization(req.user, req.body.invite_code));
}

export async function leaveOrganization(req, res) {
    return send(res, await organizationService.leaveOrganization(req.user));
}

export async function getMembers(req, res) {
    return send(res, await organizationService.getMembers(req.user));
}

export async function rotateInviteCode(req, res) {
    return send(res, await organizationService.rotateInviteCode(req.user));
}

export async function updateSettings(req, res) {
    return send(res, await organizationService.updateSettings(req.user, req.body));
}

export async function updateMemberRole(req, res) {
    return send(res, await organizationService.updateMemberRole(req.user, req.params.memberId, req.body.org_role));
}

export async function removeMember(req, res) {
    return send(res, await organizationService.removeMember(req.user, req.params.memberId));
}

export async function transferOwnership(req, res) {
    return send(res, await organizationService.transferOwnership(req.user, req.body.member_id));
}

export async function deleteOrganization(req, res) {
    return send(res, await organizationService.deleteOrganization(req.user));
}
