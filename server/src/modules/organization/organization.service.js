import Organization from './organization.model.js';
import User from '../user/user.model.js';
import Task from '../task/task.model.js';
import RemoteShift from '../remoteshift/remoteshift.model.js';
import createResponse from '../../utils/response.js';

const isAdmin = (user) => user.org_role === 'ADMIN';
const isManager = (user) => ['MANAGER', 'ADMIN'].includes(user.org_role);

function handleError(error) {
    if (error.code === 11000) return createResponse({ status: 409, message: 'Invite code already exists' });
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        const message = error.name === 'CastError'
            ? 'Invalid id'
            : Object.values(error.errors).map((item) => item.message).join(', ');
        return createResponse({ status: 400, message });
    }
    console.error(error);
    return createResponse({ status: 500, message: 'Internal server error' });
}

function requireOrganization(user) {
    return user.organization
        ? null
        : createResponse({ status: 403, message: 'You must belong to an organization' });
}

export async function getCurrent(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const organization = await Organization.findById(user.organization).populate('owner', 'username email');
        if (!organization) return createResponse({ status: 404, message: 'Organization not found' });
        return createResponse({ status: 200, data: organization, message: 'Organization found' });
    } catch (error) {
        return handleError(error);
    }
}

export async function createOrganization(user, data) {
    try {
        if (user.organization) return createResponse({ status: 400, message: 'You already belong to an organization' });
        const organization = new Organization({ name: data.name, owner: user._id, settings: data.settings });
        await organization.save();
        user.organization = organization._id;
        user.org_role = 'ADMIN';
        user.joined_org_at = new Date();
        await user.save();
        return createResponse({ status: 201, data: organization, message: 'Organization created successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function joinOrganization(user, inviteCode) {
    try {
        if (user.organization) return createResponse({ status: 400, message: 'You already belong to an organization' });
        const organization = await Organization.findOne({ invite_code: inviteCode.toUpperCase() });
        if (!organization) return createResponse({ status: 404, message: 'Invalid invite code' });
        user.organization = organization._id;
        user.org_role = 'MEMBER';
        user.joined_org_at = new Date();
        await user.save();
        return createResponse({ status: 200, data: organization, message: 'Joined organization successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function leaveOrganization(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const organization = await Organization.findById(user.organization);
        if (!organization) return createResponse({ status: 404, message: 'Organization not found' });
        if (organization.owner.equals(user._id)) return createResponse({ status: 400, message: 'Transfer ownership before leaving' });
        if (user.org_role === 'ADMIN' && await User.countDocuments({ organization: organization._id, org_role: 'ADMIN' }) <= 1) {
            return createResponse({ status: 400, message: 'The organization must have an admin' });
        }
        await Task.updateMany({ organization: organization._id, assigned_to: user._id }, { $set: { assigned_to: null } });
        user.organization = null;
        user.org_role = null;
        user.joined_org_at = null;
        await user.save();
        return createResponse({ status: 200, message: 'Left organization successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function getMembers(user) {
    try {
        const denied = requireOrganization(user);
        if (denied) return denied;
        const members = await User.find({ organization: user.organization })
            .select('username email org_role joined_org_at created_at')
            .sort({ org_role: -1, username: 1 });
        return createResponse({ status: 200, data: members, message: 'Organization members found' });
    } catch (error) {
        return handleError(error);
    }
}

export async function rotateInviteCode(user) {
    try {
        if (!isManager(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const organization = await Organization.findById(user.organization);
        if (!organization) return createResponse({ status: 404, message: 'Organization not found' });
        organization.rotateInviteCode();
        await organization.save();
        return createResponse({ status: 200, data: organization, message: 'Invite code rotated successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function updateSettings(user, settings) {
    try {
        if (!isAdmin(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const organization = await Organization.findById(user.organization);
        if (!organization) return createResponse({ status: 404, message: 'Organization not found' });
        organization.settings = { ...organization.settings, ...settings };
        await organization.save();
        return createResponse({ status: 200, data: organization, message: 'Organization settings updated successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function updateMemberRole(user, memberId, role) {
    try {
        if (!isAdmin(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const member = await User.findOne({ _id: memberId, organization: user.organization });
        if (!member) return createResponse({ status: 404, message: 'Member not found' });
        if (member._id.equals(user._id)) return createResponse({ status: 400, message: 'Use ownership transfer before changing your own role' });
        const organization = await Organization.findById(user.organization);
        if (organization.owner.equals(member._id) && role !== 'ADMIN') return createResponse({ status: 400, message: 'Transfer ownership before demoting the owner' });
        if (member.org_role === 'ADMIN' && role !== 'ADMIN' && await User.countDocuments({ organization: user.organization, org_role: 'ADMIN' }) <= 1) {
            return createResponse({ status: 400, message: 'The organization must have an admin' });
        }
        member.org_role = role;
        await member.save();
        return createResponse({ status: 200, data: member, message: 'Member role updated successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function removeMember(user, memberId) {
    try {
        if (!isManager(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const member = await User.findOne({ _id: memberId, organization: user.organization });
        if (!member) return createResponse({ status: 404, message: 'Member not found' });
        const organization = await Organization.findById(user.organization);
        if (organization.owner.equals(member._id)) return createResponse({ status: 400, message: 'Transfer ownership before removing the owner' });
        if (member.org_role === 'ADMIN' && !isAdmin(user)) return createResponse({ status: 403, message: 'Managers cannot remove admins' });
        await Task.updateMany({ organization: user.organization, assigned_to: member._id }, { $set: { assigned_to: null } });
        await RemoteShift.deleteMany({ organization: user.organization, user: member._id });
        member.organization = null;
        member.org_role = null;
        member.joined_org_at = null;
        await member.save();
        return createResponse({ status: 200, message: 'Member removed successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function transferOwnership(user, memberId) {
    try {
        if (!isAdmin(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const organization = await Organization.findById(user.organization);
        const member = await User.findOne({ _id: memberId, organization: organization?._id });
        if (!organization || !member) return createResponse({ status: 404, message: 'Member not found' });
        member.org_role = 'ADMIN';
        organization.owner = member._id;
        await member.save();
        await organization.save();
        return createResponse({ status: 200, data: organization, message: 'Ownership transferred successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function deleteOrganization(user) {
    try {
        if (!isAdmin(user)) return createResponse({ status: 403, message: 'Insufficient permissions' });
        const organization = await Organization.findById(user.organization);
        if (!organization) return createResponse({ status: 404, message: 'Organization not found' });
        if (!organization.owner.equals(user._id)) return createResponse({ status: 403, message: 'Only the organization owner can delete it' });
        await Task.updateMany({ organization: organization._id }, { $set: { organization: null, assigned_to: null } });
        await RemoteShift.deleteMany({ organization: organization._id });
        await User.updateMany({ organization: organization._id }, { $set: { organization: null, org_role: null, joined_org_at: null } });
        await organization.deleteOne();
        return createResponse({ status: 200, message: 'Organization deleted successfully' });
    } catch (error) {
        return handleError(error);
    }
}
