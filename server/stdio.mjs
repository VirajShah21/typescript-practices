import { StringDecoder } from 'node:string_decoder';
import { handleJsonRpc } from '../lib/mcp.ts';

const decoder = new StringDecoder('utf8');
const MAX_MESSAGE_BYTES = 64 * 1024;
let pending = '';
let dropping = false;

function write(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function readLine(line) {
  if (!line.trim()) return;
  if (Buffer.byteLength(line) > MAX_MESSAGE_BYTES) {
    write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request exceeds 64 KiB.' } });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    return;
  }
  try {
    const response = handleJsonRpc(payload);
    if (response !== null) write(response);
  } catch {
    write({ jsonrpc: '2.0', id: payload?.id ?? null, error: { code: -32603, message: 'Internal error' } });
  }
}

process.stdin.on('data', (chunk) => {
  pending += decoder.write(chunk);
  let newline;
  while ((newline = pending.indexOf('\n')) !== -1) {
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    if (dropping) dropping = false;
    else readLine(line);
  }
  if (Buffer.byteLength(pending) > MAX_MESSAGE_BYTES) {
    if (!dropping) write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request exceeds 64 KiB.' } });
    dropping = true;
    pending = '';
  }
});
process.stdin.on('end', () => {
  pending += decoder.end();
  if (!dropping && pending.trim()) readLine(pending);
});
process.stdin.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  console.error(error.message);
  process.exit(1);
});
