import assert from 'node:assert/strict';
import test from 'node:test';
import User from '../src/modules/user/user.model.js';
import { requireAuth, requireOrgRole } from '../src/middleware/auth.js';
import { signToken } from '../src/utils/jwt.js';

const TEST_SECRET = 'synthetic-auth-middleware-secret-for-unit-tests-only-012345';
process.env.JWT_SECRET = TEST_SECRET;

function makeResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

async function checkRole(minRole, user) {
    const req = { user };
    const res = makeResponse();
    let nextCalled = false;
    await requireOrgRole(minRole)(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

test('organization role middleware rejects unknown stored roles', async () => {
    const { res, nextCalled } = await checkRole('MEMBER', {
        organization: 'org-id',
        org_role: 'SUPERUSER'
    });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('organization role middleware rejects an invalid required role', async () => {
    const { res, nextCalled } = await checkRole('OWNER', {
        organization: 'org-id',
        org_role: 'ADMIN'
    });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('organization role middleware preserves the MEMBER, MANAGER, and ADMIN hierarchy', async () => {
    for (const [org_role, minRole, allowed] of [
        ['MEMBER', 'MEMBER', true],
        ['MEMBER', 'MANAGER', false],
        ['MEMBER', 'ADMIN', false],
        ['MANAGER', 'MEMBER', true],
        ['MANAGER', 'MANAGER', true],
        ['MANAGER', 'ADMIN', false],
        ['ADMIN', 'MEMBER', true],
        ['ADMIN', 'MANAGER', true],
        ['ADMIN', 'ADMIN', true]
    ]) {
        const { res, nextCalled } = await checkRole(minRole, { organization: 'org-id', org_role });
        assert.equal(nextCalled, allowed, `${org_role} requiring ${minRole}`);
        assert.equal(res.statusCode, allowed ? null : 403, `${org_role} requiring ${minRole}`);
    }
});

test('organization role middleware rejects users without an organization', async () => {
    const { res, nextCalled } = await checkRole('MEMBER', { organization: null, org_role: null });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('auth middleware rejects a missing token without querying users', async () => {
    const res = makeResponse();
    let nextCalled = false;
    const originalFindById = User.findById;
    User.findById = () => { throw new Error('User query should not run'); };

    try {
        await requireAuth({ cookies: {}, headers: {} }, res, () => { nextCalled = true; });
    } finally {
        User.findById = originalFindById;
    }

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('auth middleware rejects a session with a stale auth version', async () => {
    const res = makeResponse();
    const token = signToken('507f1f77bcf86cd799439011', 2);
    const originalFindById = User.findById;
    User.findById = async () => ({ auth_version: 3 });
    let nextCalled = false;

    try {
        await requireAuth({ cookies: { token }, headers: {} }, res, () => { nextCalled = true; });
    } finally {
        User.findById = originalFindById;
    }

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('auth middleware loads a current user for a valid cookie token', async () => {
    const res = makeResponse();
    const user = { _id: '507f1f77bcf86cd799439011', auth_version: 1 };
    const token = signToken(user._id, user.auth_version);
    const originalFindById = User.findById;
    let queriedId;
    User.findById = async (id) => { queriedId = id; return user; };
    let nextCalled = false;

    try {
        await requireAuth({ cookies: { token }, headers: {} }, res, () => { nextCalled = true; });
    } finally {
        User.findById = originalFindById;
    }

    assert.equal(queriedId, user._id);
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
});
