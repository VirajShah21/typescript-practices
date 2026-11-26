import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHttpServer } from '../server/http.mjs';
import { handleApiRequest } from '../lib/api.ts';
import { mcpTools } from '../lib/mcp.ts';
import {
  BatchResponseSchema, CatalogueSchema, ManifestSchema, PracticeResponseSchema, ProblemSchema,
  SearchResponseSchema, SourcesResponseSchema, TaxonomyResponseSchema, contractSchemas, jsonSchema,
} from '../lib/contracts.ts';

let base = process.env.TEST_BASE_URL;
if (!base) {
  const server = createHttpServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
}
async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body, text };
}
const rpc = (payload, options = {}) => request('/mcp', {
  method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...options.headers },
  body: typeof payload === 'string' ? payload : JSON.stringify(payload),
});
const call = (name, args = {}) => rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
const batch = ids => request('/api/v1/practices/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });

function assertProblem(result, status, code) {
  assert.equal(result.response.status, status);
  assert.match(result.response.headers.get('content-type'), /application\/problem\+json/);
  const problem = ProblemSchema.parse(result.body);
  assert.equal(problem.status, status);
  if (code) assert.equal(problem.code, code);
  return problem;
}

test('compact search has versioned metadata, useful matches, and no full content', async () => {
  const result = await request('/api/v1/practices?limit=100');
  assert.equal(result.response.status, 200);
  const { data, meta } = SearchResponseSchema.parse(result.body);
  assert.equal(meta.total, 59);
  assert.equal(data.length, 59);
  assert.equal(new Set(data.map(item => item.id)).size, 59);
  assert.equal(meta.schemaVersion, '2');
  assert.match(meta.datasetVersion, /^sha256:[a-f0-9]{64}$/);
  assert.equal(meta.hasMore, false);
  assert.equal(meta.nextOffset, null);
  for (const item of data) {
    for (const key of ['explanation', 'examples', 'citations', 'notes', 'relations']) assert.equal(Object.hasOwn(item, key), false);
    assert.ok(item.links.self.endsWith(item.id));
    assert.ok(new URL(item.links.page).searchParams.get('practice') === item.id);
    assert.ok(item.summary && item.match.snippet);
  }
  const page = await request('/api/v1/practices?limit=2&offset=1');
  assert.equal(page.body.meta.hasMore, true);
  assert.equal(page.body.meta.nextOffset, 3);
  assert.deepEqual(page.body.data.map(item => item.id), data.slice(1, 3).map(item => item.id));
  const defaultPage = await request('/api/v1/practices');
  assert.equal(defaultPage.body.data.length, 20);
  assert.ok(Buffer.byteLength(defaultPage.text) < 20000, `Default summaries should stay compact: ${Buffer.byteLength(defaultPage.text)} bytes`);
});

test('technical aliases, source/context/environment/tag filters, and empty matches work', async () => {
  const declarations = await request('/api/v1/practices?q=d.ts&context=declaration-file&source=handbook&limit=100');
  assert.equal(declarations.response.status, 200);
  assert.ok(declarations.body.meta.total >= 9);
  assert.ok(declarations.body.data.every(item => item.contexts.includes('declaration-file') && item.sourceIds.includes('handbook')));
  assert.ok(declarations.body.data.some(item => item.category === 'types'));
  assert.ok(declarations.body.data.every(item => item.match.matchedFields.length));
  const lower = await request('/api/v1/practices?q=javascript');
  const upper = await request('/api/v1/practices?q=JAVASCRIPT');
  assert.deepEqual(lower.body.data, upper.body.data);
  const browser = await request('/api/v1/practices?environment=browser&limit=100');
  assert.ok(browser.body.data.length);
  assert.ok(browser.body.data.every(item => item.environments.includes('browser')));
  const taxonomy = await request('/api/v1/taxonomy');
  const tag = taxonomy.body.data.tags.find(item => item.count > 0);
  const tagged = await request(`/api/v1/practices?tag=${tag.id}&limit=100`);
  assert.equal(tagged.body.meta.total, tag.count);
  assert.ok(tagged.body.data.every(item => item.tags.includes(tag.id)));
  for (const query of ['tag=valid-unknown-tag', 'q=zzzzzznonexistentterm', 'offset=1000']) {
    const empty = await request(`/api/v1/practices?${query}`);
    assert.equal(empty.response.status, 200);
    assert.deepEqual(empty.body.data, []);
  }
});

test('all endpoints reject unknown and repeated query parameters with field errors', async () => {
  for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'limit=', 'offset=-1', 'source=unknown', 'category=Types', 'context=wrong', 'environment=wrong', 'tag=Invalid Tag', 'limti=5', '__proto__=ignored', 'q=one&q=two', `q=${'a'.repeat(301)}`]) {
    const result = await request(`/api/v1/practices?${query}`);
    assert.ok(assertProblem(result, 400, 'invalid_query').errors.length, query);
  }
  for (const endpoint of ['sources', 'taxonomy', 'catalogue/manifest', 'schema.json', 'openapi.json', 'practices/raw-javascript-is-faster']) {
    const unknown = await request(`/api/v1/${endpoint}?unexpected=1`);
    assert.ok(assertProblem(unknown, 400).errors.some(item => item.parameter === 'unexpected'));
    const repeated = await request(`/api/v1/${endpoint}?unexpected=1&unexpected=2`);
    assert.equal(assertProblem(repeated, 400).errors[0].code, 'repeated_parameter');
  }
  assertProblem(await request('/api/v1/catalogue?format=yaml'), 400);
  assertProblem(await request('/api/v1/catalogue?format=json&unexpected=1'), 400);
  assertProblem(await request('/api/v1/categories'), 404);
  assertProblem(await request('/api/v1/practices', { method: 'POST' }), 405);
});

test('detail, batch, taxonomy, and sources conform to their shared schemas', async () => {
  const detail = await request('/api/v1/practices/raw-javascript-is-faster');
  assert.equal(detail.response.status, 200);
  const practice = PracticeResponseSchema.parse(detail.body).data;
  assert.ok(practice.notes.some(note => note.kind === 'editorial-correction'));
  assert.ok(practice.citations.length);
  assert.ok(practice.applicability.contexts.length);
  assert.equal(Object.hasOwn(practice, 'good'), false);
  const taxonomy = TaxonomyResponseSchema.parse((await request('/api/v1/taxonomy')).body);
  assert.equal(taxonomy.data.categories.length, 6);
  assert.equal(taxonomy.data.categories.reduce((sum, item) => sum + item.count, 0), 59);
  const declarationContext = await request('/api/v1/practices?context=declaration-file&limit=100');
  assert.equal(taxonomy.data.contexts.find(item => item.id === 'declaration-file').count, declarationContext.body.meta.total);
  assert.ok(declarationContext.body.meta.total >= 9);
  const sources = SourcesResponseSchema.parse((await request('/api/v1/sources')).body);
  assert.equal(sources.data.length, 2);
  const firstIds = (await request('/api/v1/practices?limit=2')).body.data.map(item => item.id);
  const result = await batch([firstIds[1], 'nonexistent-practice', firstIds[0]]);
  assert.equal(result.response.status, 200);
  const found = BatchResponseSchema.parse(result.body);
  assert.deepEqual(found.data.map(item => item.id), [firstIds[1], firstIds[0]]);
  assert.deepEqual(found.missingIds, ['nonexistent-practice']);
  assertProblem(await request('/api/v1/practices/nonexistent-practice'), 404, 'practice_not_found');
  for (const ids of [[], ['x', 'x'], Array.from({ length: 21 }, (_, i) => `practice-${i}`), ['Bad ID']]) assertProblem(await batch(ids), 400, 'invalid_body');
  assertProblem(await request('/api/v1/practices/batch', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }), 415);
  assertProblem(await request('/api/v1/practices/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }), 400, 'invalid_json');
  assertProblem(await request('/api/v1/practices/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(65537) }), 413, 'body_too_large');
});

test('manifest links, JSON/Markdown exports, and generated schemas retain attribution', async () => {
  const manifest = ManifestSchema.parse((await request('/api/v1/catalogue/manifest')).body);
  assert.equal(manifest.practiceCount, 59);
  assert.equal(manifest.sourceCount, 2);
  for (const link of Object.values(manifest.links)) assert.ok(new URL(link).pathname.startsWith('/api/v1/'));
  const json = await request('/api/v1/catalogue');
  assert.match(json.response.headers.get('content-disposition'), /attachment; filename="typescript-practices.json"/);
  const catalogue = CatalogueSchema.parse(json.body);
  assert.equal(catalogue.practices.length, 59);
  assert.equal(catalogue.sources.length, 2);
  assert.equal(catalogue.licenseNotices.length, 2);
  assert.ok(catalogue.licenseNotices.every(notice => notice.text.length > 1000));
  const markdown = await request('/api/v1/catalogue?format=markdown');
  assert.match(markdown.response.headers.get('content-type'), /text\/markdown/);
  assert.match(markdown.response.headers.get('content-disposition'), /attachment; filename="typescript-practices.md"/);
  assert.match(markdown.text, /raw-javascript-is-faster/);
  assert.match(markdown.text, /Andr[eé] de Sousa/);
  assert.match(markdown.text, /Creative Commons/);
  const schemas = await request('/api/v1/schema.json');
  assert.equal(schemas.body.$ref, '#/$defs/Catalogue');
  assert.deepEqual(schemas.body.$defs.Practice, jsonSchema(contractSchemas.Practice));
  assert.equal(schemas.body.$defs.BatchInput.properties.ids.uniqueItems, true);
  const openapi = (await request('/api/v1/openapi.json')).body;
  assert.equal(openapi.openapi, '3.1.0');
  assert.equal(openapi.info.version, '2.0.0');
  assert.deepEqual(openapi.components.schemas.Practice, schemas.body.$defs.Practice);
  assert.ok(openapi.paths['/api/v1/practices/batch'].post);
  assert.ok(openapi.paths['/api/v1/taxonomy']);
  assert.equal(openapi.paths['/api/v1/categories'], undefined);
  assert.deepEqual(openapi.components.schemas.Problem, schemas.body.$defs.Problem);
});

test('GET/HEAD representations have strong distinct ETags and support conditional reads', async () => {
  const first = await request('/api/v1/practices?limit=1');
  const etag = first.response.headers.get('etag');
  assert.match(etag, /^"[a-f0-9]{64}"$/);
  const repeat = await request('/api/v1/practices?limit=1', { headers: { 'if-none-match': etag } });
  assert.equal(repeat.response.status, 304);
  assert.equal(repeat.text, '');
  const different = await request('/api/v1/practices?limit=2', { headers: { 'if-none-match': etag } });
  assert.equal(different.response.status, 200);
  assert.notEqual(different.response.headers.get('etag'), etag);
  const weak = await request('/api/v1/practices?limit=1', { headers: { 'if-none-match': `W/${etag}` } });
  assert.equal(weak.response.status, 304);
  const head = await request('/api/v1/practices?limit=1', { method: 'HEAD' });
  assert.equal(head.response.status, 200);
  assert.equal(head.text, '');
  assert.equal(head.response.headers.get('etag'), etag);
  const privateResponse = await handleApiRequest(new Request('https://private.example/api/v1/sources'));
  assert.equal(privateResponse.headers.get('cache-control'), 'private, no-cache');
  const options = await request('/api/v1/practices/batch', { method: 'OPTIONS' });
  assert.equal(options.response.status, 204);
  assert.match(options.response.headers.get('allow'), /POST/);
});

test('six MCP tools advertise generated schemas and validate successful outputs', async () => {
  const discovery = await rpc({ jsonrpc: '2.0', id: 1, method: 'server/discover' });
  assert.deepEqual(discovery.body.result.supportedVersions, ['2026-07-28']);
  const initialized = await rpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
  assert.equal(initialized.body.result.protocolVersion, '2025-06-18');
  assert.equal(initialized.body.result.serverInfo.version, '2.0.0');
  assert.equal((await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).response.status, 202);
  const tools = (await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' })).body.result.tools;
  assert.deepEqual(tools.map(item => item.name), ['search_practices', 'get_practice', 'get_practices', 'get_taxonomy', 'list_sources', 'get_catalogue_manifest']);
  for (const tool of tools) { assert.equal(tool.inputSchema.type, 'object'); assert.equal(tool.outputSchema.type, 'object'); assert.ok(tool.annotations.readOnlyHint); }
  assert.deepEqual(tools, mcpTools);
  const cases = [
    ['search_practices', { context: 'declaration-file', limit: 1 }, SearchResponseSchema],
    ['get_practice', { id: 'raw-javascript-is-faster' }, PracticeResponseSchema],
    ['get_practices', { ids: ['raw-javascript-is-faster', 'nonexistent-practice'] }, BatchResponseSchema],
    ['get_taxonomy', {}, TaxonomyResponseSchema], ['list_sources', {}, SourcesResponseSchema], ['get_catalogue_manifest', {}, ManifestSchema],
  ];
  for (const [name, args, schema] of cases) {
    const result = (await call(name, args)).body.result;
    assert.equal(result.isError, false, name);
    schema.parse(result.structuredContent);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  }
  const mcpSearch = (await call('search_practices')).body;
  assert.ok(Buffer.byteLength(JSON.stringify(mcpSearch)) < 40000);
});

test('MCP distinguishes tool validation failures, missing records, and protocol errors', async () => {
  for (const [name, args] of [['get_practice', {}], ['get_practice', { id: 'x', extra: true }], ['search_practices', { limit: '5' }], ['search_practices', { source: 'unknown' }], ['get_taxonomy', { q: 'x' }], ['get_taxonomy', null], ['search_practices', null], ['get_practices', { ids: ['x', 'x'] }]]) {
    const message = (await call(name, args)).body;
    assert.equal(message.result.isError, true, name);
    assert.equal(ProblemSchema.parse(JSON.parse(message.result.content[0].text)).code, 'invalid_arguments');
  }
  const missing = (await call('get_practice', { id: 'nonexistent-practice' })).body.result;
  assert.equal(missing.isError, true);
  assert.equal(JSON.parse(missing.content[0].text).status, 404);
  assert.equal((await call('unknown_tool')).body.error.code, -32602);
  assert.equal((await rpc({ jsonrpc: '2.0', id: 4, method: 'unknown/method' })).body.error.code, -32601);
  assert.equal((await rpc({ jsonrpc: '1.0', id: 5, method: 'ping' })).body.error.code, -32600);
  assert.equal((await rpc([])).body.error.code, -32600);
  assert.equal((await rpc('{')).body.error.code, -32700);
});

test('MCP transport rejects foreign origins, unsupported media, oversized bodies and versions', async () => {
  const payload = { jsonrpc: '2.0', id: 1, method: 'ping' };
  assert.equal((await rpc(payload, { headers: { origin: 'https://untrusted.example' } })).response.status, 403);
  assert.equal((await rpc(payload, { headers: { origin: new URL(base).origin } })).response.status, 200);
  assert.equal((await rpc(payload, { headers: { 'content-type': 'text/plain' } })).response.status, 415);
  assert.equal((await rpc('x'.repeat(65537))).response.status, 413);
  assert.equal((await rpc(payload, { headers: { 'mcp-protocol-version': '1900-01-01' } })).response.status, 400);
  assert.equal((await request('/mcp')).response.status, 405);
});
