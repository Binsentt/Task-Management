import { rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const taskDirectory = new URL('.', import.meta.url);

function request(port, path) {
  return new Promise((resolve, reject) => {
    import('node:http').then(({ get }) => {
      get(`http://127.0.0.1:${port}${path}`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ statusCode: response.statusCode, body }));
      }).on('error', reject);
    }, reject);
  });
}

test('serves static files and falls back to the SPA entry point', async () => {
  const distDirectory = new URL('./dist/', taskDirectory);
  const fixturePath = new URL('./dist/index.html', taskDirectory);
  const port = 4317;
  const originalFixture = await import('node:fs/promises').then(({ readFile }) => readFile(fixturePath).catch(() => null));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', taskDirectory),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await writeFile(fixturePath, '<!doctype html><html><body>SPA marker</body></html>');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('frontend server did not start')), 5000);
      child.stdout.on('data', (chunk) => {
        if (chunk.toString().includes(`0.0.0.0:${port}`)) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once('error', reject);
    });

    for (const path of ['/', '/dashboard/tasks']) {
      const response = await request(port, path);
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /SPA marker/);
    }
  } finally {
    child.kill();
    if (originalFixture) await writeFile(fixturePath, originalFixture);
    else await rm(distDirectory, { recursive: true, force: true });
  }
});
