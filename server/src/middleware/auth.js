import User from '../modules/user/user.model.js';
import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';

const ROLE_RANK = { MEMBER: 1, MANAGER: 2, ADMIN: 3 };

function extractToken(req) {
    // 1. httpOnly cookie (browser app)
    if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];

    // 2. Authorization: Bearer <token> (Postman, mobile, tests)
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    return null;
}

// Verifies the token, loads the user from the database and sets req.user
export async function requireAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ message: 'Authentication required' });

        const payload = verifyToken(token);

        // fresh from the database, so role or organization changes apply right away
        const user = await User.findById(payload.sub);
        if (!user) return res.status(401).json({ message: 'Account no longer exists' });
        if ((payload.ver ?? 0) !== (user.auth_version ?? 0)) {
            return res.status(401).json({ message: 'Session has been invalidated, please log in again' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired, please log in again' });
        }
        if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        next(error);
    }
}

// requireOrgRole('MANAGER') allows managers and admins. Use after requireAuth.
export const requireOrgRole = (minRole) => (req, res, next) => {
    const { organization, org_role } = req.user;

    if (!organization || !org_role) {
        return res.status(403).json({ message: 'You must belong to an organization' });
    }
    const roleRank = Object.hasOwn(ROLE_RANK, org_role) ? ROLE_RANK[org_role] : null;
    const requiredRank = Object.hasOwn(ROLE_RANK, minRole) ? ROLE_RANK[minRole] : null;
    if (roleRank === null || requiredRank === null || roleRank < requiredRank) {
        return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
};

// Platform-level check for the app owner
export const requireSuperadmin = (req, res, next) => {
    if (req.user.system_role !== 'SUPERADMIN') {
        return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
};
