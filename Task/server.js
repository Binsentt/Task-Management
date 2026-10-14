import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = normalize(join(root, decoded));
  return candidate.startsWith(`${root}/`) || candidate === root ? candidate : null;
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  try {
    const requested = safePath(request.url || '/');
    const asset = requested && await fileExists(requested) ? requested : join(root, 'index.html');
    if (!(await fileExists(asset))) {
      response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Frontend build is unavailable');
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(asset)] || 'application/octet-stream',
      'cache-control': asset.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    createReadStream(asset).on('error', (error) => {
      response.destroy(error);
    }).pipe(response);
  } catch (error) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof URIError ? 'Invalid URL' : 'Request failed');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on 0.0.0.0:${port}`);
});
