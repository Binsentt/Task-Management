import assert from 'node:assert/strict';
import test from 'node:test';
import { registerSchema, loginSchema } from '../src/modules/auth/auth.validation.js';

const validIndividual = {
    full_name: 'Zoë Élodie',
    username: 'zoe.2026',
    email: ' ZOE.Example@GMAIL.COM ',
    password: 'StrongPass1!',
    confirmPassword: 'StrongPass1!',
    contact_number: '00123456789',
    account_type: 'individual'
};

test('signup normalizes Gmail and username while preserving contact-number leading zeroes', () => {
    const result = registerSchema.safeParse(validIndividual);
    assert.equal(result.success, true);
    assert.equal(result.data.email, 'zoe.example@gmail.com');
    assert.equal(result.data.username, 'zoe.2026');
    assert.equal(result.data.contact_number, '00123456789');
});

test('signup accepts Unicode combining marks in accented names', () => {
    const result = registerSchema.safeParse({ ...validIndividual, full_name: 'Jose\u0301 Smith' });
    assert.equal(result.success, true);
});

test('signup requires a valid organization name for organization accounts', () => {
    assert.equal(registerSchema.safeParse({
        ...validIndividual,
        account_type: 'organization',
        organization_name: 'Acme Tasks'
    }).success, true);
    assert.equal(registerSchema.safeParse({
        ...validIndividual,
        account_type: 'organization'
    }).success, false);
});

test('signup rejects invalid name, username, email and contact-number formats', () => {
    for (const overrides of [
        { full_name: 'Zoë 2' },
        { full_name: 'Élodie!' },
        { username: 'bad name' },
        { email: 'zoe@example.com' },
        { email: 'zoe@gmail.com.evil.test' },
        { contact_number: '0012-345' },
        { contact_number: '+123456' }
    ]) {
        assert.equal(registerSchema.safeParse({ ...validIndividual, ...overrides }).success, false);
    }
});

test('signup requires every password strength rule and a matching confirmation', () => {
    for (const password of ['short', 'lowercase1!', 'UPPERCASE1!', 'NoNumber!!', 'NoSymbol123']) {
        assert.equal(registerSchema.safeParse({
            ...validIndividual,
            password,
            confirmPassword: password
        }).success, false);
    }
    assert.equal(registerSchema.safeParse({
        ...validIndividual,
        confirmPassword: 'Different1!'
    }).success, false);
});

test('signup rejects passwords over bcrypt UTF-8 byte limit', () => {
    const password = `A1!${'😊'.repeat(18)}`;
    assert.ok(password.length < 72);
    assert.ok(Buffer.byteLength(password, 'utf8') > 72);
    assert.equal(registerSchema.safeParse({
        ...validIndividual,
        password,
        confirmPassword: password
    }).success, false);
});

test('login accepts a legacy email or username and does not enforce signup strength', () => {
    assert.equal(loginSchema.safeParse({ identifier: 'legacy@example.net', password: 'old' }).success, true);
    assert.equal(loginSchema.safeParse({ identifier: 'Old_User', password: 'old' }).success, true);
    assert.equal(loginSchema.safeParse({ identifier: 'legacy@example.net', password: '' }).success, false);
});
