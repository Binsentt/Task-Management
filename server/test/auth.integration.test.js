import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const canUseAtlas = Boolean(process.env.MONGODB_URI);
const apiTests = test;
let app;
let server;
let baseUrl;
let User;
let Organization;
let Task;
let smtpConfig;
const testEmailPrefix = `auth-flow-${crypto.randomBytes(6).toString('hex')}`;
const testUsernamePrefix = `auth${crypto.randomBytes(5).toString('hex')}`;
let individualPayload;
let individualCookie;
let organizationPayload;
let organizationCookie;

before(async () => {
    if (!canUseAtlas) return;
    process.env.NODE_ENV ||= 'development';
    const [{ default: expressApp }, { default: connectDB }, userModule, organizationModule, taskModule] =
        await Promise.all([
            import('../src/app.js'),
            import('../src/config/database.js'),
            import('../src/modules/user/user.model.js'),
            import('../src/modules/organization/organization.model.js'),
            import('../src/modules/task/task.model.js')
        ]);
    app = expressApp;
    User = userModule.default;
    Organization = organizationModule.default;
    Task = taskModule.default;
    smtpConfig = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM']
        .filter((name) => !process.env[name]?.trim());
    await connectDB();
    server = await new Promise((resolve, reject) => {
        const instance = app.listen(0, () => resolve(instance));
        instance.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (canUseAtlas && mongoose.connection.readyState === 1) {
        const users = await User.find({ email: new RegExp(`^${testEmailPrefix}`) }).select('_id');
        const userIds = users.map(({ _id }) => _id);
        await Task.deleteMany({ created_by: { $in: userIds } });
        await Organization.deleteMany({ owner: { $in: userIds } });
        await User.deleteMany({ _id: { $in: userIds } });
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

async function api(path, { method = 'GET', body, cookie } = {}) {
    const headers = {};
    if (body) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    return {
        response,
        payload: await response.json(),
        cookie: response.headers.get('set-cookie')?.split(';')[0]
    };
}

function signupPayload(suffix, extra = {}) {
    return {
        full_name: 'Zoë Example',
        username: `${testUsernamePrefix}${suffix}`.slice(0, 30),
        email: `${testEmailPrefix}${suffix}@gmail.com`,
        password: 'StrongPass1!',
        confirmPassword: 'StrongPass1!',
        contact_number: '00123456789',
        account_type: 'individual',
        ...extra
    };
}

apiTests('individual signup stores profile fields and returns an HttpOnly session', {
    skip: !canUseAtlas
}, async () => {
    const payload = signupPayload('ind');
    const { response, payload: result, cookie } = await api('/api/auth/register', {
        method: 'POST',
        body: { ...payload, system_role: 'SUPERADMIN', org_role: 'ADMIN', organization: 'forged' }
    });
    assert.equal(response.status, 201);
    assert.equal(result.data.user.full_name, payload.full_name);
    assert.equal(result.data.user.contact_number, payload.contact_number);
    assert.equal(result.data.user.system_role, 'USER');
    assert.equal(result.data.user.organization, null);
    assert.match(response.headers.get('set-cookie') || '', /HttpOnly/i);
    assert.equal(JSON.stringify(result).includes('token'), false);
    individualPayload = payload;
    individualCookie = cookie;

    const refreshed = await api('/api/auth/me', { cookie });
    assert.equal(refreshed.response.status, 200);
    assert.equal(refreshed.payload.data.user.username, payload.username);

    const loggedOut = await api('/api/auth/logout', { method: 'POST', cookie });
    assert.equal(loggedOut.response.status, 200);
    assert.match(loggedOut.response.headers.get('set-cookie') || '', /Expires=Thu, 01 Jan 1970/i);
    assert.equal((await api('/api/auth/me')).response.status, 401);
});

apiTests('duplicate usernames and emails are checked by the API', {
    skip: !canUseAtlas
}, async () => {
    const original = signupPayload('duplicate');
    const created = await api('/api/auth/register', { method: 'POST', body: original });
    assert.equal(created.response.status, 201);

    const usernameDuplicate = await api('/api/auth/register', {
        method: 'POST',
        body: { ...signupPayload('other'), username: original.username }
    });
    const emailDuplicate = await api('/api/auth/register', {
        method: 'POST',
        body: { ...signupPayload('third'), email: original.email }
    });
    assert.equal(usernameDuplicate.response.status, 409);
    assert.match(usernameDuplicate.payload.message, /username/i);
    assert.equal(emailDuplicate.response.status, 409);
    assert.match(emailDuplicate.payload.message, /email/i);
});

apiTests('login accepts username and email for new and legacy accounts', {
    skip: !canUseAtlas
}, async () => {
    const payload = individualPayload;
    const legacy = await User.create({
        username: `${testUsernamePrefix}legacy`.slice(0, 30),
        email: `${testEmailPrefix}legacy@example.net`,
        password: 'old-pass'
    });
    const usernameLogin = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: payload.username.toUpperCase(), password: payload.password }
    });
    const emailLogin = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: legacy.email.toUpperCase(), password: 'old-pass' }
    });
    assert.equal(usernameLogin.response.status, 200);
    assert.equal(emailLogin.response.status, 200);
});

apiTests('organization signup atomically creates the founder as its ADMIN owner', {
    skip: !canUseAtlas
}, async () => {
    const payload = signupPayload('org', {
        account_type: 'organization',
        organization_name: `Org ${testEmailPrefix}`
    });
    const { response, payload: result, cookie } = await api('/api/auth/register', {
        method: 'POST',
        body: { ...payload, org_role: 'SUPERADMIN', system_role: 'SUPERADMIN', organization: 'forged' }
    });
    assert.equal(response.status, 201);
    assert.equal(result.data.user.org_role, 'ADMIN');
    assert.equal(result.data.user.system_role, 'USER');
    assert.ok(result.data.user.organization);

    const organization = await Organization.findById(result.data.user.organization);
    assert.equal(organization.name, payload.organization_name);
    assert.equal(organization.owner.toString(), result.data.user._id);
    organizationPayload = payload;
    organizationCookie = cookie;

    const currentOrganization = await api('/api/organizations/me', { cookie });
    assert.equal(currentOrganization.response.status, 200);
    assert.equal(currentOrganization.payload.data.name, payload.organization_name);
});

apiTests('task listing enforces authenticated personal and organization scopes', {
    skip: !canUseAtlas
}, async () => {
    const noOrganization = await api('/api/tasks?scope=organization', { cookie: individualCookie });
    assert.equal(noOrganization.response.status, 403);

    const user = await User.findOne({ username: organizationPayload.username });
    const orgId = user.organization;
    const ownPersonal = await Task.create({
        title: 'Personal scope item',
        created_by: user._id
    });
    const ownOrganization = await Task.create({
        title: 'Organization scope item',
        created_by: user._id,
        organization: orgId
    });
    const otherOrganization = await Organization.create({
        name: `Other ${testEmailPrefix}`,
        owner: user._id
    });
    await Task.create({
        title: 'Other organization item',
        created_by: user._id,
        organization: otherOrganization._id
    });

    const personalTasks = await api('/api/tasks?scope=personal', { cookie: organizationCookie });
    assert.equal(personalTasks.response.status, 200);
    assert.deepEqual(personalTasks.payload.data.tasks.map((task) => task._id), [ownPersonal._id.toString()]);

    const organizationTasks = await api('/api/tasks?scope=organization', { cookie: organizationCookie });
    assert.equal(organizationTasks.response.status, 200);
    assert.deepEqual(organizationTasks.payload.data.tasks.map((task) => task._id), [ownOrganization._id.toString()]);
});

apiTests('password reset is public, single-use, and invalidates prior sessions', {
    skip: !canUseAtlas
}, async () => {
    const payload = signupPayload('reset');
    const created = await api('/api/auth/register', { method: 'POST', body: payload });
    const user = await User.findById(created.payload.data.user._id);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.password_reset_token_hash = resetTokenHash;
    user.password_reset_expires_at = new Date(Date.now() + 60_000);
    await user.save();

    const changed = await api('/api/auth/reset-password', {
        method: 'POST',
        body: {
            token: resetToken,
            password: 'ChangedPass2!',
            confirmPassword: 'ChangedPass2!'
        }
    });
    assert.equal(changed.response.status, 200);
    assert.equal(JSON.stringify(changed.payload).includes(resetToken), false);
    assert.equal((await api('/api/auth/me', { cookie: created.cookie })).response.status, 401);

    const reuse = await api('/api/auth/reset-password', {
        method: 'POST',
        body: {
            token: resetToken,
            password: 'ChangedPass3!',
            confirmPassword: 'ChangedPass3!'
        }
    });
    assert.equal(reuse.response.status, 400);

    const oldPassword = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: payload.email, password: payload.password }
    });
    const newPassword = await api('/api/auth/login', {
        method: 'POST',
        body: { identifier: payload.email, password: 'ChangedPass2!' }
    });
    assert.equal(oldPassword.response.status, 401);
    assert.equal(newPassword.response.status, 200);
});

apiTests('forgot-password endpoint reports missing SMTP settings consistently', {
    skip: !canUseAtlas
}, async (context) => {
    if (smtpConfig.length === 0) {
        context.skip('SMTP is configured, so the local missing-configuration response does not apply');
    }
    const unknown = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: `${testEmailPrefix}unknown@gmail.com` }
    });
    const known = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: `${testEmailPrefix}reset@gmail.com` }
    });
    assert.equal(unknown.response.status, 503);
    assert.equal(known.response.status, 503);
    assert.equal(unknown.payload.message, known.payload.message);
    assert.match(unknown.payload.message, /SMTP_/);
});
