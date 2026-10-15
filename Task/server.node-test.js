import { rm, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
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
        response.on('end', () => resolve({ statusCode: response.statusCode, headers: response.headers, body }));
      }).on('error', reject);
    }, reject);
  });
}

test('serves static files and falls back to the SPA entry point', async () => {
  const distDirectory = new URL('./dist/', taskDirectory);
  const fixturePath = new URL('./dist/index.html', taskDirectory);
  const assetPath = new URL('./dist/assets/proxy-test.js', taskDirectory);
  const port = 4317;
  const originalFixture = await import('node:fs/promises').then(({ readFile }) => readFile(fixturePath).catch(() => null));
  const upstream = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'token=example; HttpOnly; Path=/' });
    response.end(JSON.stringify({ path: request.url }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('.', taskDirectory),
    env: { ...process.env, PORT: String(port), API_ORIGIN: `http://127.0.0.1:${upstream.address().port}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await writeFile(fixturePath, '<!doctype html><html><body>SPA marker</body></html>');
    await mkdir(new URL('./dist/assets/', taskDirectory), { recursive: true });
    await writeFile(assetPath, 'console.log("asset marker")');
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
    const asset = await request(port, '/assets/proxy-test.js');
    assert.equal(asset.statusCode, 200);
    assert.match(asset.body, /asset marker/);
    const api = await request(port, '/api/health');
    assert.equal(api.statusCode, 200);
    assert.deepEqual(JSON.parse(api.body), { path: '/api/health' });
    assert.match(api.headers['set-cookie'][0], /HttpOnly/);
    assert.equal((await request(port, '/health')).statusCode, 200);
  } finally {
    child.kill();
    await new Promise((resolve) => upstream.close(resolve));
    await rm(assetPath, { force: true });
    if (originalFixture) await writeFile(fixturePath, originalFixture);
    else await rm(distDirectory, { recursive: true, force: true });
  }
});
