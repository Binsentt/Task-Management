import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const serverDirectory = fileURLToPath(new URL('../', import.meta.url));
const secretMarker = 'SHOULD_NEVER_APPEAR_8471';

function runStartup(environment = {}, setup = '') {
    const script = `
        import mongoose from 'mongoose';
        mongoose.connect = async () => {
            console.error('TEST_DB_CONNECT');
            throw Object.assign(new Error('mongodb://private:${secretMarker}@invalid.example/private'), {
                name: 'MongooseServerSelectionError', code: 'ETIMEDOUT'
            });
        };
        mongoose.disconnect = async () => {};
        ${setup}
        await import('./src/server.js');
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: serverDirectory,
        env: {
            ...process.env,
            DOTENV_CONFIG_PATH: fileURLToPath(new URL('./nonexistent-startup-env', import.meta.url)),
            MONGODB_URI: 'mongodb://127.0.0.1:1/startup_test',
            JWT_SECRET: 'disposable-startup-test-secret-at-least-32-characters',
            NODE_ENV: 'test',
            PORT: '5000',
            ...environment,
        },
        encoding: 'utf8',
        timeout: 8000,
        windowsHide: true,
    });
    assert.ifError(result.error);
    return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

test('startup rejects missing configuration before attempting MongoDB', () => {
    const result = runStartup({ MONGODB_URI: '', JWT_SECRET: '' });
    assert.equal(result.code, 1);
    assert.match(result.output, /Missing environment variables: MONGODB_URI, JWT_SECRET/);
    assert.doesNotMatch(result.output, /TEST_DB_CONNECT/);
});

test('startup treats whitespace-only configuration as missing', () => {
    const result = runStartup({ MONGODB_URI: '   ', JWT_SECRET: ' '.repeat(40) });
    assert.equal(result.code, 1);
    assert.match(result.output, /Missing environment variables: MONGODB_URI, JWT_SECRET/);
    assert.doesNotMatch(result.output, /TEST_DB_CONNECT/);
});

test('startup rejects an invalid MongoDB scheme without echoing its value', () => {
    const result = runStartup({ MONGODB_URI: `https://private:${secretMarker}@invalid.example/private` });
    assert.equal(result.code, 1);
    assert.match(result.output, /MONGODB_URI must use mongodb:\/\/ or mongodb\+srv:\/\//);
    assert.doesNotMatch(result.output, /TEST_DB_CONNECT|SHOULD_NEVER_APPEAR/);
});

test('startup rejects a short JWT secret before attempting MongoDB', () => {
    const result = runStartup({ JWT_SECRET: 'too-short' });
    assert.equal(result.code, 1);
    assert.match(result.output, /JWT_SECRET must be at least 32 characters/);
    assert.doesNotMatch(result.output, /TEST_DB_CONNECT|too-short/);
});

test('startup rejects a port outside the TCP range before attempting MongoDB', () => {
    const result = runStartup({ PORT: '65536' });
    assert.equal(result.code, 1);
    assert.match(result.output, /PORT must be an integer between 1 and 65535/);
    assert.doesNotMatch(result.output, /TEST_DB_CONNECT/);
});

test('startup reports database connection failures without raw messages or stack traces', () => {
    const result = runStartup();
    assert.equal(result.code, 1);
    assert.match(result.output, /MongoDB is unreachable/);
    assert.doesNotMatch(result.output, /SHOULD_NEVER_APPEAR|mongodb:\/\/private|\n\s+at /);
});

test('startup catches a listen failure and reports it without an unhandled error', () => {
    const result = runStartup({}, `
        const http = await import('node:http');
        const { EventEmitter } = await import('node:events');
        const { syncBuiltinESMExports } = await import('node:module');
        const server = new EventEmitter();
        server.listen = () => {
            queueMicrotask(() => server.emit('error', Object.assign(new Error('${secretMarker}'), { code: 'EADDRINUSE' })));
            return server;
        };
        server.close = (callback) => callback?.();
        server.closeAllConnections = () => {};
        http.default.createServer = () => server;
        syncBuiltinESMExports();
        mongoose.connect = async () => {};
    `);
    assert.equal(result.code, 1);
    assert.match(result.output, /port is already in use/i);
    assert.doesNotMatch(result.output, /SHOULD_NEVER_APPEAR|Unhandled 'error'|\n\s+at /);
});
