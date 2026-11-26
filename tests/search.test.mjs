import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { practices, sources, licenseNotices, metadata, listPractices, listTaxonomy, getCatalogue, catalogueMarkdown } from '../lib/catalog.ts';
import { searchCatalogue } from '../lib/search.ts';
import { canonicalJson } from '../lib/canonical-json.ts';

const cases = [
  ['How should I validate untrusted JSON?', 'validate-data'],
  ['d.ts', 'primitive-types'],
  ['strcit configuration', 'strict-configuration'],
  ['strictNullChecks', 'strict-configuration'],
  ['raw JavaScript is faster', 'raw-javascript-is-faster'],
  ['===', 'strict-equality'],
  ['optional callback arguments', 'callback-parameters'],
  ['how do I type callbacks', 'callback-return-void'],
];
for (const [q, expected] of cases) {
  test(`search relevance: ${q}`, () => {
    const result = searchCatalogue(practices, { q, limit: 3 });
    assert.ok(result.matches.some(match => match.practice.id === expected), JSON.stringify(result));
    assert.ok(result.matches.every(match => match.match.matchedFields.length && match.match.snippet.length <= 222));
  });
}
test('search filters match structured applicability and the same ranked results feed REST', () => {
  const query = { q: 'unknown', source: 'handbook', context: 'declaration-file', limit: 2 };
  const shared = searchCatalogue(practices, query);
  const wire = listPractices(query, 'http://localhost:3001');
  assert.deepEqual(wire.data.map(item => item.id), shared.matches.map(item => item.practice.id));
  assert.deepEqual(wire.data.map(item => item.match), shared.matches.map(item => item.match));
  assert.ok(shared.matches.every(({practice}) => practice.citations.some(citation => citation.sourceId === 'handbook') && practice.applicability.contexts.includes('declaration-file')));
  for (const environment of ['browser', 'node', 'runtime-independent']) {
    assert.ok(searchCatalogue(practices, { environment, limit: 100 }).matches.every(({practice}) => practice.applicability.environments.includes(environment)));
  }
  assert.equal(searchCatalogue(practices, { tag: 'unknown-tag' }).total, 0);
  assert.equal(searchCatalogue(practices, { q: 'banana callback' }).total, 0);
  assert.equal(searchCatalogue(practices, { q: '[.*]' }).total, 0);
});
test('compact results omit full content and pagination is deterministic', () => {
  const first = listPractices({limit: 2});
  const next = listPractices({limit: 2, offset: first.meta.nextOffset});
  assert.equal(first.meta.total, 59);
  assert.equal(first.meta.hasMore, true);
  assert.equal(first.meta.nextOffset, 2);
  assert.equal(new Set([...first.data, ...next.data].map(item => item.id)).size, 4);
  for (const item of first.data) {
    assert.equal(item.explanation, undefined);
    assert.equal(item.examples, undefined);
    assert.equal(item.notes, undefined);
    assert.ok(item.links.page.startsWith('https://'));
  }
  const complete = listPractices({limit:100});
  assert.equal(complete.meta.hasMore, false);
  assert.equal(complete.meta.nextOffset, null);
  const pastEnd = listPractices({offset:1000});
  assert.equal(pastEnd.data.length, 0);
  assert.equal(pastEnd.meta.hasMore, false);
});
test('snapshot metadata hashes the actual catalogue and exported notices travel with it', () => {
  const expected = `sha256:${createHash('sha256').update(canonicalJson({schemaVersion:'2',sources,practices,licenseNotices})).digest('hex')}`;
  assert.equal(metadata.datasetVersion, expected);
  assert.equal(getCatalogue().licenseNotices.length, 2);
  const markdown = catalogueMarkdown();
  assert.ok(markdown.includes(metadata.datasetVersion));
  assert.ok(markdown.includes('Copyright (c) 2021 André de Sousa'));
  assert.ok(markdown.includes('Creative Commons'));
  assert.ok(markdown.includes('Verification: illustrative.'));
  const taxonomy = listTaxonomy();
  assert.equal(taxonomy.data.categories.reduce((sum, item) => sum+item.count, 0), 59);
  assert.ok(taxonomy.data.contexts.every(item => typeof item.label === 'string'));
});

test('snapshot serialization ignores object key order but preserves array order', () => {
  assert.equal(canonicalJson({b: [1, 2], a: {z: 1, x: 'é'}}), canonicalJson({a: {x:'é', z:1}, b:[1,2]}));
  assert.notEqual(canonicalJson({a:[1,2]}), canonicalJson({a:[2,1]}));
});
