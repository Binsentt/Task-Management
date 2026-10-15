import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const configuredApi = process.env.API_ORIGIN || process.env.VITE_API_URL;
const apiOrigin = configuredApi ? new URL(configuredApi).origin : null;

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
  const candidate = resolve(root, `.${decoded}`);
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === '' || (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !pathFromRoot.startsWith(sep)) ? candidate : null;
}

async function proxyApi(request, response) {
  if (!apiOrigin) {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'API_ORIGIN is not configured on the frontend service' }));
    return;
  }
  try {
    const target = new URL(request.url, apiOrigin);
    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request,
      duplex: 'half',
      signal: AbortSignal.timeout(15000),
    });
    const responseHeaders = {};
    for (const [name, value] of upstream.headers) {
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(name)) responseHeaders[name] = value;
    }
    if (upstream.headers.getSetCookie) responseHeaders['set-cookie'] = upstream.headers.getSetCookie();
    response.writeHead(upstream.status, responseHeaders);
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
    else response.end();
  } catch {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Backend API is unavailable' }));
  }
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
    if (request.url === '/health') {
      response.writeHead(await fileExists(join(root, 'index.html')) ? 200 : 503, { 'content-type': 'text/plain' });
      response.end('OK');
      return;
    }
    if (request.url?.startsWith('/api/')) return proxyApi(request, response);
    const requested = safePath(request.url || '/');
    const asset = requested && await fileExists(requested) ? requested : request.url?.startsWith('/assets/') ? null : join(root, 'index.html');
    if (!asset) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Asset not found');
      return;
    }
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

server.on('upgrade', (request, socket, head) => {
  if (!request.url?.startsWith('/ws') || !apiOrigin) return socket.destroy();
  const target = new URL(request.url, apiOrigin);
  const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = transport(target, { headers: { ...request.headers, host: target.host } });
  upstream.on('upgrade', (response, backendSocket, backendHead) => {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
    if (head.length) backendSocket.write(head);
    if (backendHead.length) socket.write(backendHead);
    socket.pipe(backendSocket).pipe(socket);
  });
  upstream.on('response', () => socket.destroy());
  upstream.on('error', () => socket.destroy());
  upstream.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on 0.0.0.0:${port}`);
});
