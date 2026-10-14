import assert from 'node:assert/strict';
import test from 'node:test';
import { safeErrorMessage } from '../src/utils/safeError.js';

test('an SRV resolver refusal is identified as a DNS failure', () => {
    assert.match(safeErrorMessage(Object.assign(new Error('PRIVATE_DETAIL'), {
        code: 'ECONNREFUSED', syscall: 'querySrv',
    })), /DNS lookup failed/);
});

test('unknown error messages and stacks never appear in diagnostics', () => {
    assert.doesNotMatch(safeErrorMessage(new Error('PRIVATE_DETAIL')), /PRIVATE_DETAIL|\n\s+at /);
});

test('MongoDB authentication failure has a safe actionable diagnostic', () => {
    assert.match(safeErrorMessage({ code: 18, message: 'PRIVATE_DETAIL' }), /authentication failed/);
});
