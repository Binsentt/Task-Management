import assert from 'node:assert/strict';
import test from 'node:test';
import { getTestDatabaseConfig } from './test-database-config.js';

test('database integration tests never fall back to MONGODB_URI', () => {
    assert.equal(getTestDatabaseConfig({ MONGODB_URI: 'mongodb://localhost/production' }), null);
});

test('accepts an explicit isolated database ending in _test', () => {
    const uri = 'mongodb://127.0.0.1:27017/task_management_test';
    assert.deepEqual(getTestDatabaseConfig({ TEST_MONGODB_URI: uri }), { uri, dbName: 'task_management_test' });
});

test('accepts a uniquely named isolated test database', () => {
    const uri = 'mongodb+srv://example.invalid/task_management_test_run-123?retryWrites=true';
    assert.equal(getTestDatabaseConfig({ TEST_MONGODB_URI: uri }).dbName, 'task_management_test_run-123');
});

test('rejects databases without an explicit test name', () => {
    for (const uri of ['mongodb://localhost/production', 'mongodb://localhost/', 'https://localhost/task_test', 'mongodb://localhost/invalid%2Fdb_test']) {
        assert.throws(() => getTestDatabaseConfig({ TEST_MONGODB_URI: uri }), /TEST_MONGODB_URI/);
    }
});

test('rejects ambiguous database overrides', () => {
    assert.throws(() => getTestDatabaseConfig({
        TEST_MONGODB_URI: 'mongodb://localhost/task_test?dbName=production',
    }), /TEST_MONGODB_URI/);
});

test('rejects a test database whose name matches the configured production database', () => {
    assert.throws(() => getTestDatabaseConfig({
        TEST_MONGODB_URI: 'mongodb://localhost/task_test',
        MONGODB_URI: 'mongodb+srv://production.invalid/task_test',
    }), /different/);
});

test('test configuration errors never echo credentials', () => {
    assert.throws(() => getTestDatabaseConfig({
        TEST_MONGODB_URI: 'mongodb://private:DO_NOT_PRINT_THIS@localhost/production',
    }), (error) => !error.message.includes('DO_NOT_PRINT_THIS') && !error.message.includes('mongodb://'));
});
