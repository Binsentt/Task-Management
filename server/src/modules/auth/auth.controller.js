import * as authService from './auth.service.js';
import { setAuthCookie, clearAuthCookie } from '../../utils/jwt.js';

// Puts the token in an httpOnly cookie and keeps it out of the JSON body
function respond(res, result) {
    if (result.data?.token) {
        setAuthCookie(res, result.data.token);
        result = { ...result, data: { user: result.data.user } };
    }
    return res.status(result.status).json(result);
}

export async function register(req, res) {
    const result = await authService.register(req.body);
    return respond(res, result);
}

export async function login(req, res) {
    const result = await authService.login(req.body);
    return respond(res, result);
}

export function logout(req, res) {
    clearAuthCookie(res);
    return res.status(200).json({ status: 200, data: null, message: 'Logged out successfully' });
}

// requireAuth has already loaded the user into req.user
export function me(req, res) {
    return res.status(200).json({ status: 200, data: { user: req.user }, message: 'Authenticated' });
}