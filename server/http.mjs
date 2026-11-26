import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { handleApiRequest, makeProblem } from '../lib/api.ts';
import { handleMcpRequest } from '../lib/mcp.ts';

const MAX_BODY_BYTES = 64 * 1024;

/** Run the same read-only handlers used by the hosted site. */
export function createHttpServer({ host = '127.0.0.1' } = {}) {
  return createServer(async (incoming, outgoing) => {
    try {
      const hostname = incoming.headers.host;
      if (!hostname || !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(hostname)) {
        if (host === '127.0.0.1' || host === 'localhost' || host === '::1') {
          outgoing.writeHead(400, { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' });
          outgoing.end(JSON.stringify(makeProblem('http://127.0.0.1/', 400, 'invalid_host', 'Invalid Host header.')));
          return;
        }
      }
      const base = `http://${hostname || '127.0.0.1'}`;
      const url = new URL(incoming.url || '/', base);
      if (url.origin !== new URL(base).origin) {
        outgoing.writeHead(400, { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' });
        outgoing.end(JSON.stringify(makeProblem(base, 400, 'invalid_target', 'Use an origin-relative request target.')));
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
        outgoing.writeHead(413, { 'Content-Type': ['/mcp', '/api/mcp'].includes(url.pathname) ? 'application/json' : 'application/problem+json', 'Cache-Control': 'no-store' });
        outgoing.end(JSON.stringify(['/mcp', '/api/mcp'].includes(url.pathname) ? { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Request body exceeds 64 KiB.' } } : makeProblem(url.href, 413, 'body_too_large', 'Request body exceeds 64 KiB.')));
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
      if (['/mcp', '/api/mcp'].includes(url.pathname)) response = await handleMcpRequest(request);
      else if (url.pathname.startsWith('/api/')) response = await handleApiRequest(request);
      else response = new Response(JSON.stringify(makeProblem(request, 404, 'not_found', 'See /api/v1/openapi.json or use POST /mcp.')), { status: 404, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' });
      outgoing.end(JSON.stringify(makeProblem('http://127.0.0.1/', 500, 'internal_error', 'The server could not complete this request.')));
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
