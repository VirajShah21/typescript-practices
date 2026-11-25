import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { handleApiRequest } from '../lib/api.ts';
import { handleMcpRequest } from '../lib/mcp.ts';

const MAX_BODY_BYTES = 64 * 1024;

/** Run the same read-only handlers used by the hosted site. */
export function createHttpServer({ host = '127.0.0.1' } = {}) {
  return createServer(async (incoming, outgoing) => {
    try {
      const hostname = incoming.headers.host;
      if (!hostname || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(hostname)) {
        if (host === '127.0.0.1' || host === 'localhost' || host === '::1') {
          outgoing.writeHead(400, { 'Content-Type': 'application/json' });
          outgoing.end(JSON.stringify({ error: 'Invalid Host header.' }));
          return;
        }
      }
      const base = `http://${hostname || '127.0.0.1'}`;
      const url = new URL(incoming.url || '/', base);
      if (url.origin !== new URL(base).origin) {
        outgoing.writeHead(400, { 'Content-Type': 'application/json' });
        outgoing.end(JSON.stringify({ error: 'Use an origin-relative request target.' }));
        return;
      }
      const body = await new Promise((resolveBody, rejectBody) => {
        let size = 0;
        let tooLarge = false;
        const chunks = [];
        incoming.on('data', (chunk) => {
          if (tooLarge) return;
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            tooLarge = true;
            chunks.length = 0;
            resolveBody(null);
            return;
          }
          chunks.push(chunk);
        });
        incoming.on('end', () => { if (!tooLarge) resolveBody(Buffer.concat(chunks)); });
        incoming.on('error', rejectBody);
      });
      if (body === null) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json' });
        outgoing.end(JSON.stringify({ error: 'Request body exceeds 64 KiB.' }));
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      const request = new Request(url, {
        method: incoming.method || 'GET',
        headers,
        ...(body.length ? { body } : {}),
      });
      let response;
      if (url.pathname === '/mcp') response = await handleMcpRequest(request);
      else if (url.pathname.startsWith('/api/')) response = handleApiRequest(request);
      else response = Response.json({ error: 'Not found. See /api/v1/openapi.json or use POST /mcp.' }, { status: 404 });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer from 0 to 65535.');
  const server = createHttpServer({ host });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.listen(port, host, () => {
    const address = server.address();
    console.error(`TypeScript Practices API listening at http://${host}:${address.port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      server.closeIdleConnections();
    });
  }
}
