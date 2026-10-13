import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getMissingSmtpConfiguration,
    sendPasswordResetEmail
} from '../src/modules/auth/email.service.js';

const smtpConfig = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'mailer@example.test',
    SMTP_PASSWORD: 'test-only-password',
    SMTP_FROM: 'Task Management <mailer@example.test>',
    CLIENT_URL: 'http://localhost:5174'
};

test('SMTP blocker lists missing variable names but never configuration values', () => {
    const missing = getMissingSmtpConfiguration({});
    assert.deepEqual(missing, ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM']);
    assert.equal(JSON.stringify(missing).includes('test-only-password'), false);
});

test('reset mail uses the configured frontend URL without logging or returning the token', async () => {
    const deliveries = [];
    const result = await sendPasswordResetEmail(
        'person@gmail.com',
        'private-reset-token',
        {
            environment: smtpConfig,
            transportFactory: (options) => ({
                sendMail: async (message) => {
                    deliveries.push({ options, message });
                    return { accepted: [message.to] };
                }
            })
        }
    );

    assert.equal(result, undefined);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].options.host, smtpConfig.SMTP_HOST);
    assert.match(deliveries[0].message.text, /http:\/\/localhost:5174\/reset-password\?token=private-reset-token/);
    assert.equal(deliveries[0].message.to, 'person@gmail.com');
});

test('reset mail defaults to the local Vite origin when CLIENT_URL is not supplied', async () => {
    let resetMessage;
    const environment = { ...smtpConfig };
    delete environment.CLIENT_URL;
    await sendPasswordResetEmail('person@gmail.com', 'private-reset-token', {
        environment,
        transportFactory: () => ({
            sendMail: async (message) => {
                resetMessage = message;
            }
        })
    });

    assert.match(resetMessage.text, /http:\/\/localhost:5174\/reset-password/);
});

test('mail transport failures propagate for generic handling by the auth service', async () => {
    await assert.rejects(
        sendPasswordResetEmail('person@gmail.com', 'private-reset-token', {
            environment: smtpConfig,
            transportFactory: () => ({
                sendMail: async () => {
                    throw new Error('private transport detail');
                }
            })
        }),
        /private transport detail/
    );
});
