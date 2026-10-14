import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import test, { after, before } from 'node:test';
import { getTestDatabaseConfig } from './test-database-config.js';
import { configureWindowsDnsServers } from '../src/config/database.js';
import { COOKIE_NAME, signToken } from '../src/utils/jwt.js';

const testDatabase = getTestDatabaseConfig();
const canUseAtlas = Boolean(testDatabase);
const databaseSkipReason = testDatabase ? false : 'TEST_MONGODB_URI is not set; production MONGODB_URI is never used';
process.env.NODE_ENV = 'test';
if (process.env.TEST_JWT_SECRET && process.env.TEST_JWT_SECRET.trim().length < 32) {
    throw new Error('TEST_JWT_SECRET must have at least 32 characters');
}
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || crypto.randomBytes(32).toString('hex');
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
    // Integration tests must never send real email through inherited production SMTP settings.
    for (const name of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM']) process.env[name] = '';
    const [{ default: expressApp }, userModule, organizationModule, taskModule] =
        await Promise.all([
            import('../src/app.js'),
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
    if (testDatabase.uri.startsWith('mongodb+srv://')) configureWindowsDnsServers();
    await mongoose.connect(testDatabase.uri, { dbName: testDatabase.dbName, serverSelectionTimeoutMS: 10000 });
    await Promise.all([User.init(), Organization.init(), Task.init()]);
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
    if (testDatabase && mongoose.connection.readyState !== 0) await mongoose.disconnect();
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

async function createTestActor(suffix, { organization = null, org_role = null } = {}) {
    const user = await User.create({
        username: `${testUsernamePrefix}${suffix}`.slice(0, 30),
        email: `${testEmailPrefix}${suffix}@example.net`,
        password: 'SyntheticPass1!',
        organization,
        org_role,
        joined_org_at: organization ? new Date() : null
    });
    const token = signToken(user._id, user.auth_version);
    return { user, cookie: `${COOKIE_NAME}=${token}` };
}

apiTests('individual signup stores profile fields and returns an HttpOnly session', {
    skip: databaseSkipReason
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
    skip: databaseSkipReason
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
    skip: databaseSkipReason
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
    skip: databaseSkipReason
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
    skip: databaseSkipReason
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

apiTests('task API supports personal CRUD and isolates each personal task to its owner', {
    skip: databaseSkipReason
}, async () => {
    const owner = await createTestActor('personal-owner');
    const otherUser = await createTestActor('personal-other');
    const created = await api('/api/tasks', {
        method: 'POST',
        cookie: owner.cookie,
        body: { title: 'Personal task lifecycle', content: 'Private task content' }
    });
    assert.equal(created.response.status, 201);
    const taskId = created.payload.data._id;
    assert.equal(created.payload.data.organization, null);
    assert.equal(created.payload.data.created_by, owner.user._id.toString());

    const fetched = await api(`/api/tasks/${taskId}`, { cookie: owner.cookie });
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.payload.data.title, 'Personal task lifecycle');

    for (const request of [
        api(`/api/tasks/${taskId}`, { cookie: otherUser.cookie }),
        api(`/api/tasks/${taskId}`, {
            method: 'PATCH', cookie: otherUser.cookie, body: { title: 'Unauthorized edit' }
        }),
        api(`/api/tasks/${taskId}`, { method: 'DELETE', cookie: otherUser.cookie })
    ]) {
        assert.equal((await request).response.status, 404);
    }

    const completed = await api(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        cookie: owner.cookie,
        body: { title: 'Updated personal task', status: 'DONE' }
    });
    assert.equal(completed.response.status, 200);
    assert.equal(completed.payload.data.status, 'DONE');
    assert.ok(completed.payload.data.completed_at);

    const reopened = await api(`/api/tasks/${taskId}`, {
        method: 'PATCH', cookie: owner.cookie, body: { status: 'IN_PROGRESS' }
    });
    assert.equal(reopened.response.status, 200);
    assert.equal(reopened.payload.data.status, 'IN_PROGRESS');
    assert.equal(reopened.payload.data.completed_at, null);

    const deleted = await api(`/api/tasks/${taskId}`, { method: 'DELETE', cookie: owner.cookie });
    assert.equal(deleted.response.status, 200);
    assert.equal((await api(`/api/tasks/${taskId}`, { cookie: owner.cookie })).response.status, 404);
    const persisted = await Task.findById(taskId);
    assert.ok(persisted, 'soft deletion should preserve the task record');
    assert.ok(persisted.deleted_at, 'soft deletion should set deleted_at');
});

apiTests('organization task API enforces member, assignee, and cross-organization access', {
    skip: databaseSkipReason
}, async () => {
    const organizationAdmin = await User.findOne({ username: organizationPayload.username });
    const organizationId = organizationAdmin.organization;
    const member = await createTestActor('org-member', { organization: organizationId, org_role: 'MEMBER' });
    const foreignOwner = await createTestActor('foreign-owner');
    const foreignOrganization = await Organization.create({
        name: `Foreign ${testEmailPrefix}`,
        owner: foreignOwner.user._id
    });
    foreignOwner.user.organization = foreignOrganization._id;
    foreignOwner.user.org_role = 'ADMIN';
    foreignOwner.user.joined_org_at = new Date();
    await foreignOwner.user.save();

    const unassigned = await api('/api/tasks', {
        method: 'POST',
        cookie: organizationCookie,
        body: { title: 'Organization task', is_org_task: true }
    });
    assert.equal(unassigned.response.status, 201);
    const unassignedId = unassigned.payload.data._id;
    assert.equal(unassigned.payload.data.organization, organizationId.toString());
    assert.equal((await api(`/api/tasks/${unassignedId}`, { cookie: member.cookie })).response.status, 200);
    const memberEdit = await api(`/api/tasks/${unassignedId}`, {
        method: 'PATCH', cookie: member.cookie, body: { title: 'Member edit' }
    });
    assert.equal(memberEdit.response.status, 403);
    const memberDelete = await api(`/api/tasks/${unassignedId}`, {
        method: 'DELETE', cookie: member.cookie
    });
    assert.equal(memberDelete.response.status, 403);
    for (const request of [
        api(`/api/tasks/${unassignedId}`, { cookie: foreignOwner.cookie }),
        api(`/api/tasks/${unassignedId}`, {
            method: 'PATCH', cookie: foreignOwner.cookie, body: { title: 'Cross-org edit' }
        }),
        api(`/api/tasks/${unassignedId}`, { method: 'DELETE', cookie: foreignOwner.cookie })
    ]) {
        assert.equal((await request).response.status, 404);
    }

    const foreignTask = await Task.create({
        title: 'Foreign organization task',
        created_by: foreignOwner.user._id,
        organization: foreignOrganization._id
    });
    for (const request of [
        api(`/api/tasks/${foreignTask._id}`, { cookie: organizationCookie }),
        api(`/api/tasks/${foreignTask._id}`, {
            method: 'PATCH', cookie: organizationCookie, body: { title: 'Cross-org edit' }
        }),
        api(`/api/tasks/${foreignTask._id}`, { method: 'DELETE', cookie: organizationCookie })
    ]) {
        assert.equal((await request).response.status, 404);
    }

    const assigned = await api('/api/tasks', {
        method: 'POST',
        cookie: organizationCookie,
        body: { title: 'Assigned organization task', is_org_task: true }
    });
    assert.equal(assigned.response.status, 201);
    const assignedId = assigned.payload.data._id;
    const assignment = await api(`/api/tasks/${assignedId}`, {
        method: 'PATCH',
        cookie: organizationCookie,
        body: { assigned_to: member.user._id.toString() }
    });
    assert.equal(assignment.response.status, 200);
    assert.equal(assignment.payload.data.assigned_to, member.user._id.toString());

    const assigneeEdit = await api(`/api/tasks/${assignedId}`, {
        method: 'PATCH', cookie: member.cookie, body: { status: 'DONE' }
    });
    assert.equal(assigneeEdit.response.status, 200);
    assert.equal(assigneeEdit.payload.data.status, 'DONE');
});

apiTests('password reset is public, single-use, and invalidates prior sessions', {
    skip: databaseSkipReason
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
    skip: databaseSkipReason
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
