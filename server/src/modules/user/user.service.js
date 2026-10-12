import User from './user.model.js';
import createResponse from '../../utils/response.js';

function handleError(error) {
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const message = field === 'username' ? 'Username already taken' : 'Email already registered';
        return createResponse({ status: 409, message });
    }
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((item) => item.message).join(', ');
        return createResponse({ status: 400, message });
    }
    console.error(error);
    return createResponse({ status: 500, message: 'Internal server error' });
}

export async function getProfile(user) {
    return createResponse({ status: 200, data: { user }, message: 'Profile found' });
}

export async function updateProfile(user, updates) {
    try {
        user.username = updates.username ?? user.username;
        user.email = updates.email ?? user.email;
        await user.save();
        return createResponse({ status: 200, data: user, message: 'Profile updated successfully' });
    } catch (error) {
        return handleError(error);
    }
}

export async function getOrganizationMembers(user) {
    try {
        const members = await User.find({ organization: user.organization })
            .select('username email organization org_role joined_org_at created_at')
            .sort({ username: 1 });
        return createResponse({ status: 200, data: members, message: 'Organization members found' });
    } catch (error) {
        return handleError(error);
    }
}

