import assert from 'node:assert/strict';
import test from 'node:test';
import User from '../src/modules/user/user.model.js';

const legacyUser = {
    username: 'old_user',
    email: 'legacy@example.net',
    password: 'legacy-password'
};

test('legacy user documents remain valid without profile signup fields', () => {
    return assert.doesNotReject(() => new User(legacyUser).validate());
});

test('new profile fields retain leading zeroes as an optional string', () => {
    const user = new User({
        ...legacyUser,
        full_name: 'Zoë Example',
        contact_number: '0012345'
    });
    return user.validate().then(() => {
        assert.equal(user.contact_number, '0012345');
    });
});

test('full name schema accepts Unicode combining marks in accented names', async () => {
    const user = new User({ ...legacyUser, full_name: 'Jose\u0301 Smith' });
    await assert.doesNotReject(user.validate());
});

test('optional profile fields reject invalid values when present', async () => {
    const invalidName = new User({ ...legacyUser, full_name: 'Zoë 2' });
    const invalidPhone = new User({ ...legacyUser, contact_number: '123-45' });
    await assert.rejects(invalidName.validate(), (error) => Boolean(error.errors.full_name));
    await assert.rejects(invalidPhone.validate(), (error) => Boolean(error.errors.contact_number));
});

test('password reset state is private and session versions default to zero', () => {
    const user = new User(legacyUser);
    assert.equal(user.auth_version, 0);
    assert.equal(User.schema.path('password_reset_token_hash').options.select, false);
    assert.equal(User.schema.path('password_reset_expires_at').options.select, false);
});
