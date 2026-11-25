import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHttpServer } from '../server/http.mjs';

async function withServer(run) {
  const server = createHttpServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try { await run(origin); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('portable HTTP serves the shared catalogue and MCP tools', async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/api/v1/practices?q=raw%20javascript`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /raw-javascript-is-faster/);
    const mcp = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'tools', method: 'tools/list' }),
    });
    assert.equal(mcp.status, 200);
    const message = await mcp.json();
    assert.equal(message.id, 'tools');
    assert.ok(message.result.tools.some(tool => tool.name === 'search_practices'));
  });
});

test('portable HTTP refuses foreign browser origins and oversized requests', async () => {
  await withServer(async origin => {
    const foreign = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://unrelated.example' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(foreign.status, 403);
    const oversized = await fetch(`${origin}/mcp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(65_537),
    });
    assert.equal(oversized.status, 413);
  });
});

test('stdio emits only JSON-RPC replies, ignores notifications, and exits on EOF', async () => {
  const child = spawn(process.execPath, ['--experimental-strip-types', 'server/stdio.mjs'], {
    cwd: new URL('..', import.meta.url), stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const exit = once(child, 'exit');
  child.stdin.end([
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } } }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_practice', arguments: { id: 'raw-javascript-is-faster' } } }),
    '{bad json',
    '',
  ].join('\n'));
  const [code] = await exit;
  assert.equal(code, 0, stderr);
  const replies = stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(replies.length, 3);
  assert.equal(replies[0].result.protocolVersion, '2025-06-18');
  assert.equal(replies[1].id, 2);
  assert.match(JSON.stringify(replies[1].result), /raw-javascript-is-faster/);
  assert.equal(replies[2].error.code, -32700);
});
