import User from '../user/user.model.js';
import createResponse from '../../utils/response.js';
import { signToken } from '../../utils/jwt.js';

function handleError(error) {
    // duplicate key from the unique indexes on username and email
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

export async function register({ username, email, password }) {
    try {
        // Only these three fields are used. Every new account is an individual:
        // organization, org_role and system_role are never set from user input.
        const user = await User.create({ username, email, password });

        return createResponse(201, { user, token: signToken(user._id) }, 'Account created successfully');
    } catch (error) {
        return handleError(error);
    }
}

export async function login({ email, password }) {
    try {
        // password is select:false in the model, so ask for it explicitly
        const user = await User.findOne({ email }).select('+password');
        const valid = user && (await user.comparePassword(password));

        // same message for "no such email" and "wrong password"
        if (!valid) return createResponse(401, null, 'Invalid email or password');

        return createResponse(200, { user, token: signToken(user._id) }, 'Logged in successfully');
    } catch (error) {
        return handleError(error);
    }
}