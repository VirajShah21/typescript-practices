import test, { after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHttpServer } from "../server/http.mjs";

let base = process.env.TEST_BASE_URL;
if (!base) {
  const server = createHttpServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
}
const api = async (path) => {
  const response = await fetch(`${base}${path}`);
  return { response, body: await response.json() };
};
const rpc = async (payload, options = {}) => {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...options.headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
  const raw = response.status === 202 ? "" : await response.text();
  let body = null;
  if (raw) {
    try { body = JSON.parse(raw); }
    catch { body = raw; }
  }
  return { response, body };
};
const call = (name, args = {}) => rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });

test("API returns the complete catalogue without duplicate IDs and preserves source scope", async () => {
  const { response, body } = await api("/api/v1/practices?limit=100");
  assert.equal(response.status, 200);
  assert.equal(body.total, 59);
  assert.equal(body.data.length, 59);
  assert.equal(new Set(body.data.map((item) => item.id)).size, 59);
  assert.equal(body.data.filter((item) => item.source === "community").length, 50);
  assert.equal(body.data.filter((item) => item.source === "handbook").length, 9);
  for (const item of body.data) {
    assert.ok(item.sourceUrl.startsWith("https://"));
    assert.ok(item.scope.length > 0);
    for (const id of item.related) assert.ok(body.data.some((other) => other.id === id), `Unknown related ID: ${id}`);
  }
});

test("API search is literal, case-insensitive, filtered, and paginated", async () => {
  const lower = await api("/api/v1/practices?q=javascript&limit=100");
  const upper = await api("/api/v1/practices?q=JAVASCRIPT&limit=100");
  assert.deepEqual(lower.body, upper.body);
  assert.ok(lower.body.total > 0);
  const declarations = await api("/api/v1/practices?source=handbook&category=Declarations&limit=2&offset=1");
  assert.equal(declarations.response.status, 200);
  assert.equal(declarations.body.data.length, 2);
  assert.equal(declarations.body.offset, 1);
  assert.equal(declarations.body.total, 6);
  assert.ok(declarations.body.data.every((item) => item.source === "handbook" && item.category === "Declarations"));
  const literal = await api("/api/v1/practices?q=%5B.*%5D");
  assert.equal(literal.response.status, 200);
  assert.equal(literal.body.total, 0);
  const pastEnd = await api("/api/v1/practices?offset=1000");
  assert.equal(pastEnd.body.data.length, 0);
  assert.equal(pastEnd.body.total, 59);
});

test("API rejects invalid or ambiguous query parameters", async () => {
  for (const query of ["limit=0", "limit=101", "limit=1.5", "limit=", "offset=-1", "source=unknown", "category=unknown", "limti=5", "q=one&q=two", `q=${"a".repeat(301)}`]) {
    const { response, body } = await api(`/api/v1/practices?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(body.error.code, "invalid_request");
    assert.equal(typeof body.error.message, "string");
  }
});

test("API detail, attribution, category counts and OpenAPI agree", async () => {
  const found = await api("/api/v1/practices/raw-javascript-is-faster");
  assert.equal(found.response.status, 200);
  assert.equal(found.body.data.id, "raw-javascript-is-faster");
  assert.ok(found.body.data.caveat);
  assert.equal((await api("/api/v1/practices/does-not-exist")).response.status, 404);
  const categories = await api("/api/v1/categories");
  assert.equal(categories.body.data.length, 6);
  assert.equal(categories.body.data.reduce((sum, item) => sum + item.count, 0), 59);
  const sources = await api("/api/v1/sources");
  assert.equal(sources.body.data.length, 2);
  assert.ok(sources.body.data.every((item) => item.revision && item.license && item.licenseUrl));
  const openapi = await api("/api/v1/openapi.json");
  assert.equal(openapi.body.openapi, "3.1.0");
  assert.equal(openapi.body.paths["/api/v1/practices"].get.operationId, "searchPractices");
});

test("MCP supports Site discovery, standard initialization, tools and notifications", async () => {
  const discovery = await rpc({ jsonrpc: "2.0", id: 1, method: "server/discover" });
  assert.deepEqual(discovery.body.result.supportedVersions, ["2026-07-28"]);
  const initialized = await rpc({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
  assert.equal(initialized.body.result.protocolVersion, "2025-06-18");
  assert.ok(initialized.body.result.capabilities.tools);
  const notification = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(notification.response.status, 202);
  const tools = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  assert.deepEqual(tools.body.result.tools.map((item) => item.name), ["search_practices", "get_practice", "list_categories", "list_sources"]);
  assert.ok(tools.body.result.tools.every((item) => item.annotations.readOnlyHint && item.inputSchema.type === "object"));
  const result = await call("search_practices", { source: "handbook", limit: 1 });
  assert.equal(result.body.result.isError, false);
  assert.equal(result.body.result.structuredContent.total, 9);
  assert.equal(result.body.result.structuredContent.data.length, 1);
  assert.deepEqual(JSON.parse(result.body.result.content[0].text), result.body.result.structuredContent);
  const found = await call("get_practice", { id: "raw-javascript-is-faster" });
  assert.equal(found.body.result.structuredContent.data.id, "raw-javascript-is-faster");
  const missing = await call("get_practice", { id: "does-not-exist" });
  assert.equal(missing.body.result.isError, true);
});

test("MCP validates protocol and tool arguments without executing invalid input", async () => {
  for (const [name, args] of [["get_practice", {}], ["get_practice", { id: "x", extra: true }], ["search_practices", { limit: "5" }], ["search_practices", { source: "unknown" }], ["list_categories", { q: "x" }], ["unknown_tool", {}]]) {
    const result = await call(name, args);
    assert.equal(result.body.error.code, -32602, name);
  }
  const unknownMethod = await rpc({ jsonrpc: "2.0", id: 4, method: "unknown/method" });
  assert.equal(unknownMethod.body.error.code, -32601);
  const invalid = await rpc({ jsonrpc: "1.0", id: 5, method: "ping" });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.code, -32600);
  const array = await rpc([]);
  assert.equal(array.body.error.code, -32600);
  const malformed = await rpc("{");
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.body.error.code, -32700);
});

test("MCP enforces origin, media type, request size, protocol version, and method", async () => {
  const payload = { jsonrpc: "2.0", id: 1, method: "ping" };
  const foreign = await rpc(payload, { headers: { origin: "https://untrusted.example" } });
  assert.equal(foreign.response.status, 403);
  const same = await rpc(payload, { headers: { origin: new URL(base).origin } });
  assert.equal(same.response.status, 200);
  assert.deepEqual(same.body.result, {});
  const wrongType = await rpc(payload, { headers: { "content-type": "text/plain" } });
  assert.equal(wrongType.response.status, 415);
  const tooLarge = await rpc(JSON.stringify({ ...payload, padding: "x".repeat(65536) }));
  assert.equal(tooLarge.response.status, 413);
  const version = await rpc(payload, { headers: { "mcp-protocol-version": "1900-01-01" } });
  assert.equal(version.response.status, 400);
  assert.equal((await fetch(`${base}/mcp`)).status, 405);
});
