import Presence, { PresencePing } from './presence.model.js';
import User from '../user/user.model.js';
import createResponse from '../../utils/response.js';

const isManager = (user) => ['MANAGER', 'ADMIN'].includes(user.org_role);
const ONLINE_WINDOW_MS = 15 * 1000;
const PING_TIMEOUT_MS = 10 * 1000;

function handleError(error) {
    if (error.name === 'CastError') return createResponse({ status: 400, message: 'Invalid id' });
    console.error(error);
    return createResponse({ status: 500, message: 'Internal server error' });
}

function requireOrganization(user) {
    return user.organization
        ? null
        : createResponse({ status: 403, message: 'You must belong to an organization' });
}

export async function heartbeat(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const presence = await Presence.findOneAndUpdate(
            { user: user._id },
            {
                user: user._id,
                organization: user.organization,
                last_seen_at: new Date(),
                status: 'ONLINE'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return createResponse({ status: 200, data: presence, message: 'Heartbeat recorded' });
    } catch (error) {
        return handleError(error);
    }
}

export async function getPresence(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const members = await User.find({ organization: user.organization })
            .select('_id username email org_role')
            .sort({ username: 1 })
            .lean();
        const records = await Presence.find({ organization: user.organization }).lean();
        const recordByUser = new Map(records.map((record) => [record.user.toString(), record]));
        const now = Date.now();
        const visibleMembers = isManager(user) ? members : members.filter((member) => member._id.equals(user._id));
        const data = visibleMembers.map((member) => {
            const record = recordByUser.get(member._id.toString());
            const lastSeen = record?.last_seen_at || null;
            return {
                user: member,
                last_seen_at: lastSeen,
                status: lastSeen && now - new Date(lastSeen).getTime() <= ONLINE_WINDOW_MS ? 'ONLINE' : 'OFFLINE'
            };
        });
        return createResponse({ status: 200, data, message: 'Presence found' });
    } catch (error) {
        return handleError(error);
    }
}

export async function sendPing(user, targetId) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        if (!isManager(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        if (user._id.equals(targetId)) return createResponse({ status: 400, message: 'You cannot ping yourself' });
        const target = await User.findOne({ _id: targetId, organization: user.organization });
        if (!target) return createResponse({ status: 404, message: 'Member not found' });
        const ping = await PresencePing.create({
            organization: user.organization,
            sender: user._id,
            target: target._id,
            expires_at: new Date(Date.now() + PING_TIMEOUT_MS)
        });
        return createResponse({ status: 201, data: ping, message: 'Ping sent' });
    } catch (error) {
        return handleError(error);
    }
}

export async function respondToPing(user, pingId) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const ping = await PresencePing.findOne({ _id: pingId, target: user._id, organization: user.organization });
        if (!ping) return createResponse({ status: 404, message: 'Ping not found' });
        if (ping.status !== 'PENDING') return createResponse({ status: 409, message: 'Ping is no longer active' });
        if (ping.expires_at <= new Date()) {
            ping.status = 'NO_RESPONSE';
            await ping.save();
            return createResponse({ status: 410, data: ping, message: 'Ping expired' });
        }
        ping.status = 'RESPONDED';
        ping.responded_at = new Date();
        await ping.save();
        await heartbeat(user);
        return createResponse({ status: 200, data: ping, message: 'Ping answered' });
    } catch (error) {
        return handleError(error);
    }
}

export async function getPings(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        if (!isManager(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        await expirePings(user.organization);
        const pings = await PresencePing.find({ organization: user.organization })
            .sort({ sent_at: -1 })
            .limit(100)
            .populate('sender target', 'username email');
        return createResponse({ status: 200, data: pings, message: 'Presence pings found' });
    } catch (error) {
        return handleError(error);
    }
}

export async function expirePings(organization) {
    const pings = await PresencePing.find({
        organization,
        status: 'PENDING',
        expires_at: { $lte: new Date() }
    });
    if (pings.length > 0) {
        await PresencePing.updateMany(
            { _id: { $in: pings.map((ping) => ping._id) }, status: 'PENDING' },
            { $set: { status: 'NO_RESPONSE' } }
        );
        pings.forEach((ping) => { ping.status = 'NO_RESPONSE'; });
    }
    return pings;
}

export const PING_TIMEOUT = PING_TIMEOUT_MS;