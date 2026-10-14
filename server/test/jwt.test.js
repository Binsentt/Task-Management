import assert from 'node:assert/strict';
import test from 'node:test';
import { clearAuthCookie, COOKIE_NAME, setAuthCookie, signToken, verifyToken } from '../src/utils/jwt.js';

const TEST_SECRET = 'synthetic-jwt-secret-for-unit-tests-only-0123456789';
process.env.JWT_SECRET = TEST_SECRET;

function captureCookieCalls() {
    const calls = {};
    const response = {
        cookie(...args) {
            calls.set = args;
            return this;
        },
        clearCookie(...args) {
            calls.clear = args;
            return this;
        }
    };
    return { calls, response };
}

test('signs and verifies a JWT with the current auth version', () => {
    const token = signToken('507f1f77bcf86cd799439011', 4);
    const payload = verifyToken(token);
    assert.equal(payload.sub, '507f1f77bcf86cd799439011');
    assert.equal(payload.ver, 4);
    assert.ok(payload.exp > payload.iat);
});

test('uses auth version zero when signing legacy sessions', () => {
    const token = signToken('507f1f77bcf86cd799439011');
    assert.equal(verifyToken(token).ver, 0);
});

test('rejects missing or short JWT secrets without exposing the secret', () => {
    for (const secret of ['', 'short-test-secret']) {
        process.env.JWT_SECRET = secret;
        assert.throws(() => signToken('507f1f77bcf86cd799439011'), (error) => {
            assert.match(error.message, /JWT_SECRET is missing or too short/);
            if (secret) assert.equal(error.message.includes(secret), false);
            return true;
        });
    }
    process.env.JWT_SECRET = TEST_SECRET;
});

test('rejects tokens signed with a different secret', () => {
    process.env.JWT_SECRET = TEST_SECRET;
    const token = signToken('507f1f77bcf86cd799439011');
    process.env.JWT_SECRET = 'another-synthetic-jwt-secret-for-unit-tests-only-987654321';
    assert.throws(() => verifyToken(token));
    process.env.JWT_SECRET = TEST_SECRET;
});

test('sets a development cookie with HttpOnly, root path, Lax, and no Secure flag', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SAMESITE = 'lax';
    const { calls, response } = captureCookieCalls();
    setAuthCookie(response, 'synthetic-cookie-token');

    assert.equal(calls.set[0], COOKIE_NAME);
    assert.equal(calls.set[1], 'synthetic-cookie-token');
    assert.deepEqual(calls.set[2], {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
});

test('sets a production cross-site cookie with HttpOnly, Secure, None, and root path', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SAMESITE = 'none';
    const { calls, response } = captureCookieCalls();
    setAuthCookie(response, 'synthetic-cookie-token');

    assert.equal(calls.set[0], COOKIE_NAME);
    assert.deepEqual(calls.set[2], {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
});

test('clears the cookie with matching path and security attributes', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SAMESITE = 'none';
    const { calls, response } = captureCookieCalls();
    clearAuthCookie(response);

    assert.deepEqual(calls.clear, [COOKIE_NAME, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
    }]);
});
