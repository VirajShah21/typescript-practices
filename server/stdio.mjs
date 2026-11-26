import { handleJsonRpc } from '../lib/mcp.ts';

const MAX_MESSAGE_BYTES = 64 * 1024;
let pending = [];
let pendingBytes = 0;
let dropping = false;
const write = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const parseError = message => write({ jsonrpc: '2.0', id: null, error: { code: -32700, message } });

function readLine(bytes) {
  let line;
  try { line = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { parseError('Message must contain UTF-8 JSON.'); return; }
  if (!line.trim()) return;
  let payload;
  try { payload = JSON.parse(line); }
  catch { parseError('Parse error: invalid JSON.'); return; }
  try {
    const response = handleJsonRpc(payload);
    if (response !== null) write(response);
  } catch {
    write({ jsonrpc: '2.0', id: payload?.id ?? null, error: { code: -32603, message: 'Internal server error.' } });
  }
}
function resetLine() { pending = []; pendingBytes = 0; dropping = false; }
process.stdin.on('data', chunk => {
  let start = 0;
  while (start < chunk.length) {
    const newline = chunk.indexOf(10, start);
    const end = newline < 0 ? chunk.length : newline;
    const segment = chunk.subarray(start, end);
    if (!dropping) {
      if (pendingBytes + segment.length > MAX_MESSAGE_BYTES) {
        write({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request exceeds 64 KiB.' } });
        dropping = true;
        pending = [];
        pendingBytes = 0;
      } else {
        pending.push(segment);
        pendingBytes += segment.length;
      }
    }
    if (newline < 0) break;
    if (!dropping) readLine(Buffer.concat(pending, pendingBytes));
    resetLine();
    start = newline + 1;
  }
});
process.stdin.on('end', () => { if (!dropping && pendingBytes) readLine(Buffer.concat(pending, pendingBytes)); });
process.stdin.on('error', error => { console.error(error.message); process.exitCode = 1; });
process.stdout.on('error', error => {
  if (error.code === 'EPIPE') process.exit(0);
  console.error(error.message);
  process.exit(1);
});
