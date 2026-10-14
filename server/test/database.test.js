import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';

test('MongoDB connection has a bounded server selection timeout', async (context) => {
    const connect = context.mock.method(mongoose, 'connect', async () => {});
    context.mock.method(console, 'log', () => {});
    await connectDB();
    assert.equal(connect.mock.calls[0].arguments[1]?.serverSelectionTimeoutMS, 10000);
});

test('database events handle errors and report disconnection and recovery without raw error details', async (context) => {
    const messages = [];
    context.mock.method(mongoose, 'connect', async () => {});
    context.mock.method(console, 'log', (...values) => messages.push(values.join(' ')));
    context.mock.method(console, 'error', (...values) => messages.push(values.join(' ')));
    await connectDB();
    assert.ok(mongoose.connection.listenerCount('error') > 0, 'an error observer must exist');
    mongoose.connection.emit('error', new Error('mongodb://private:SHOULD_NEVER_APPEAR@invalid.example/private'));
    mongoose.connection.emit('disconnected');
    mongoose.connection.emit('reconnected');
    assert.match(messages.join('\n'), /MongoDB disconnected/);
    assert.match(messages.join('\n'), /MongoDB reconnected/);
    assert.doesNotMatch(messages.join('\n'), /SHOULD_NEVER_APPEAR|mongodb:\/\/private/);
});
