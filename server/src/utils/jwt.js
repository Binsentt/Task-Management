import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Read the secret lazily so it works no matter when dotenv loads
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET is missing or too short (use at least 32 random characters)');
    }
    return secret;
}

// The token only identifies the user. Roles and organization are NOT stored in it,
// they are loaded from the database on every request so changes apply immediately.
export function signToken(userId, authVersion = 0) {
    return jwt.sign({ sub: userId.toString(), ver: authVersion }, getSecret(), {
        algorithm: 'HS256',
        expiresIn: TOKEN_TTL_SECONDS
    });
}

export function verifyToken(token) {
    return jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
}

const cookieOptions = () => ({
    httpOnly: true, // JavaScript in the browser can't read it (blocks token theft via XSS)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    // 'lax' works when frontend and API share a site. If they are on different domains in
    // production, use sameSite: 'none' (requires secure: true)
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/'
});

export function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearAuthCookie(res) {
    const { maxAge, ...options } = cookieOptions();
    res.clearCookie(COOKIE_NAME, options);
}