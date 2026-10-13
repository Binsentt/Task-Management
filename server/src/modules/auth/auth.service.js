import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Organization from '../organization/organization.model.js';
import User, { PASSWORD_SALT_ROUNDS } from '../user/user.model.js';
import createResponse from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';
import {
    getMissingSmtpConfiguration,
    sendPasswordResetEmail
} from './email.service.js';

const resetMessage = 'If the email address is registered, reset instructions will be sent if delivery is available.';

function handleError(error) {
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const message = field === 'username' ? 'Username already taken' : 'Email already registered';
        return createResponse(409, null, message);
    }
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map((e) => e.message).join(', ');
        return createResponse(400, null, message);
    }
    console.error(error);
    return createResponse(500, null, 'Internal server error');
}

export async function register(data) {
    try {
        const userData = {
            full_name: data.full_name,
            username: data.username,
            email: data.email,
            password: data.password,
            contact_number: data.contact_number,
            system_role: 'USER'
        };

        let user;
        if (data.account_type === 'organization') {
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    [user] = await User.create([userData], { session });
                    const [organization] = await Organization.create([{
                        name: data.organization_name,
                        owner: user._id
                    }], { session });
                    user.organization = organization._id;
                    user.org_role = 'ADMIN';
                    user.joined_org_at = new Date();
                    await user.save({ session });
                });
            } finally {
                await session.endSession();
            }
        } else {
            user = await User.create(userData);
        }

        return createResponse(
            201,
            { user, token: signToken(user._id, user.auth_version) },
            'Account created successfully'
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function login({ identifier, password }) {
    try {
        const query = identifier.includes('@')
            ? { email: identifier }
            : { username: identifier };
        const user = await User.findOne(query).select('+password');
        const valid = user && (await user.comparePassword(password));

        if (!valid) return createResponse(401, null, 'Invalid username or password');

        return createResponse(
            200,
            { user, token: signToken(user._id, user.auth_version) },
            'Logged in successfully'
        );
    } catch (error) {
        return handleError(error);
    }
}

export async function checkAvailability({ username, email }) {
    try {
        if (username) {
            const exists = await User.exists({ username });
            return createResponse(200, { available: !exists }, 'Username availability checked');
        }
        const exists = await User.exists({ email });
        return createResponse(200, { available: !exists }, 'Email availability checked');
    } catch (error) {
        return handleError(error);
    }
}

export function hashPasswordResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, {
        $set: {
            password_reset_token_hash: hashPasswordResetToken(token),
            password_reset_expires_at: new Date(Date.now() + 30 * 60 * 1000)
        }
    });
    return token;
}

export async function requestPasswordReset({ email }) {
    const missing = getMissingSmtpConfiguration();
    if (missing.length > 0) {
        return createResponse(
            503,
            null,
            `Password reset email is unavailable. Configure: ${missing.join(', ')}`
        );
    }

    try {
        const user = await User.findOne({ email });
        if (!user) return createResponse(200, null, resetMessage);

        const token = await createPasswordResetToken(user);
        try {
            await sendPasswordResetEmail(email, token);
        } catch {
            await User.updateOne({
                _id: user._id,
                password_reset_token_hash: hashPasswordResetToken(token)
            }, {
                $unset: {
                    password_reset_token_hash: 1,
                    password_reset_expires_at: 1
                }
            });
            console.error('Password reset email delivery failed; verify SMTP configuration and connectivity.');
        }

        return createResponse(200, null, resetMessage);
    } catch (error) {
        return handleError(error);
    }
}

export async function resetPassword({ token, password }) {
    try {
        const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
        const user = await User.findOneAndUpdate({
            password_reset_token_hash: hashPasswordResetToken(token),
            password_reset_expires_at: { $gt: new Date() }
        }, {
            $set: {
                password: passwordHash,
                password_reset_token_hash: null,
                password_reset_expires_at: null
            },
            $inc: { auth_version: 1 }
        }, {
            returnDocument: 'after',
            runValidators: true
        });

        if (!user) return createResponse(400, null, 'Reset token is invalid or expired');
        return createResponse(200, null, 'Password reset successfully. Please log in again.');
    } catch (error) {
        return handleError(error);
    }
}
