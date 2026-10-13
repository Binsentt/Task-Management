import assert from 'node:assert/strict';
import test from 'node:test';
import * as databaseConfig from '../src/config/database.js';

test('Windows development DNS uses the configured operating-system resolvers', () => {
    const configuredServers = ['192.0.2.53'];
    let appliedServers;

    databaseConfig.configureWindowsDnsServers({
        platform: 'win32',
        getServers: () => configuredServers,
        setServers: (servers) => {
            appliedServers = servers;
        },
    });

    assert.deepEqual(appliedServers, configuredServers);
});

test('non-Windows DNS configuration remains unchanged', () => {
    let resolverChanged = false;

    databaseConfig.configureWindowsDnsServers({
        platform: 'linux',
        getServers: () => {
            throw new Error('Windows resolver lookup should not run');
        },
        setServers: () => {
            resolverChanged = true;
        },
    });

    assert.equal(resolverChanged, false);
});
