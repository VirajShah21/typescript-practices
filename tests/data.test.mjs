import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { z } from "zod";
import {
  SCHEMA_VERSION,
  PracticeSchema,
  PracticesSchema,
  SourceSchema,
  SourcesSchema,
  LicenseNoticesSchema,
} from "../lib/models.ts";
import {
  categories,
  categoryIds,
  contexts,
  contextIds,
  environments,
  environmentIds,
  sourceIds,
} from "../lib/taxonomy.ts";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const practices = readJson("../data/practices.json");
const sources = readJson("../data/sources.json");
const licenseNotices = readJson("../data/license-notices.json");
const byId = new Map(practices.map((practice) => [practice.id, practice]));
const copy = (value) => structuredClone(value);

const originalIds = [
  "follow-conventions", "testing", "strict-configuration", "avoid-any", "string-unions",
  "meaningful-names", "utility-types", "const-and-let", "strict-equality", "literal-syntax",
  "avoid-globals", "separate-concerns", "reduce-nesting", "small-functions", "parameter-objects",
  "boolean-parameters", "useful-comments", "measure-loops", "array-methods", "validate-data",
  "clear-blocks", "default-parameters", "spread-and-destructuring", "template-literals", "switch-defaults",
  "boolean-names", "declarations-near-use", "initialize-variables", "iterators-and-generators", "pure-functions",
  "immutability", "side-effects", "magic-numbers", "conditionals", "handle-errors",
  "promises-and-async", "avoid-surprising-features", "browser-standards", "script-loading", "dom-access",
  "configuration", "progressive-enhancement", "raw-javascript-is-faster", "organize-imports", "modularization",
  "lazy-loading", "compression", "minification", "lighthouse", "web-workers",
  "primitive-types", "used-type-parameters", "unknown-over-any", "callback-return-void", "callback-parameters",
  "callback-arity", "overload-order", "optional-overloads", "union-overloads",
];

test("the migrated catalogue validates and preserves all original practice IDs", () => {
  assert.equal(SCHEMA_VERSION, "2");
  assert.deepEqual(PracticesSchema.parse(practices), practices);
  assert.deepEqual(practices.slice(0, originalIds.length).map((practice) => practice.id), originalIds);
  assert.deepEqual(practices.slice(originalIds.length).map((practice) => practice.id), ["viraj-prettier-configuration"]);
  for (const practice of practices) {
    for (const legacyField of ["source", "sourceTitle", "sourceUrl", "scope", "caveat", "bad", "good", "related"]) {
      assert.equal(Object.hasOwn(practice, legacyField), false, `${practice.id} retained ${legacyField}`);
    }
  }
});

test("source snapshots and origin attribution remain distinct from supporting citations", () => {
  assert.deepEqual(SourcesSchema.parse(sources), sources);
  assert.deepEqual(sources.filter(source => source.id !== "viraj").map(({ id, revision, checkedAt, license }) => ({ id, revision, checkedAt, license })), [
    { id: "community", revision: "aaedb9fadd42711e30a9eb984c2b10d4abaab71c", checkedAt: "2026-11-25", license: "MIT" },
    { id: "handbook", revision: "a03790f13df45ca6302abae688432762121db3c8", checkedAt: "2026-11-25", license: "CC-BY-4.0" },
  ]);
  const originCounts = { community: 0, handbook: 0, viraj: 0 };
  for (const practice of practices) {
    const origins = practice.citations.filter((citation) => citation.role === "origin");
    assert.equal(origins.length, 1, practice.id);
    originCounts[origins[0].sourceId] += 1;
    for (const citation of practice.citations) {
      assert.ok(sourceIds.includes(citation.sourceId), practice.id);
      assert.ok(citation.url.includes("#"), `${practice.id} lacks a section link`);
    }
  }
  assert.deepEqual(originCounts, { community: 50, handbook: 9, viraj: 1 });
  assert.deepEqual(byId.get("avoid-any").citations.map(({ sourceId, role }) => [sourceId, role]), [
    ["community", "origin"], ["handbook", "supports"],
  ]);
  assert.deepEqual(byId.get("unknown-over-any").citations.map(({ sourceId, role }) => [sourceId, role]), [
    ["handbook", "origin"], ["community", "supports"],
  ]);
});

test("applicability distinguishes browser behavior, compiler settings, and conditional declaration contracts", () => {
  for (const id of ["script-loading", "dom-access", "progressive-enhancement", "browser-standards", "web-workers", "lighthouse"]) {
    assert.deepEqual(byId.get(id).applicability.environments, ["browser"], id);
  }
  assert.deepEqual(byId.get("strict-configuration").applicability.contexts, ["compiler-configuration"]);
  assert.ok(byId.get("callback-parameters").applicability.when.some((condition) => condition.includes("supplies")));
  assert.ok(byId.get("optional-overloads").applicability.when.some((condition) => condition.includes("same type")));
  assert.ok(byId.get("union-overloads").applicability.exceptions.some((exception) => exception.includes("return type differs")));
  for (const id of ["validate-data", "template-literals", "spread-and-destructuring", "const-and-let", "configuration", "used-type-parameters"]) {
    assert.deepEqual(byId.get(id).applicability.exceptions, [], `${id} must not expose ordinary warnings or restatements as exceptions`);
  }
  assert.deepEqual(byId.get("callback-parameters").applicability.when, ["The API supplies an argument whenever it invokes a callback."]);
  assert.deepEqual(byId.get("callback-parameters").applicability.exceptions, ["Make a callback parameter optional if the API really can omit that argument."]);
  assert.match(byId.get("array-methods").applicability.exceptions[0], /early exit/);
  assert.match(byId.get("measure-loops").applicability.exceptions[0], /measurement/);
  for (const practice of practices) {
    assert.ok(practice.applicability.when.length > 0, practice.id);
  }
});

test("examples describe their actual language, assumptions, and illustrative status", () => {
  const examples = practices.flatMap((practice) => practice.examples);
  assert.equal(examples.length, 49);
  for (const example of examples) assert.deepEqual(example.verification, { status: "illustrative" });
  for (const id of ["script-loading", "progressive-enhancement"]) {
    assert.equal(byId.get(id).examples[0].language, "html");
  }
  const configuration = byId.get("strict-configuration").examples[0];
  assert.equal(configuration.language, "json");
  for (const variant of configuration.variants) assert.doesNotThrow(() => JSON.parse(variant.code));
  assert.ok(byId.get("array-methods").examples[0].explanation.includes("existing users array"));
  assert.ok(byId.get("promises-and-async").examples[0].explanation.includes("promise-returning versions"));
  assert.deepEqual(byId.get("measure-loops").examples[0].variants.map((variant) => variant.role), ["tradeoff", "prefer"]);
  assert.deepEqual(byId.get("raw-javascript-is-faster").examples[0].variants.map((variant) => variant.role), ["prefer"]);
});

test("editorial changes are identified separately from source-derived recommendations", () => {
  for (const id of ["avoid-any", "declarations-near-use", "raw-javascript-is-faster", "promises-and-async"]) {
    const note = byId.get(id).notes.find((item) => item.kind === "editorial-correction");
    assert.ok(note, id);
    assert.match(note.text, /community source/i);
  }
  assert.ok(byId.get("avoid-any").notes[0].references.some((reference) => reference.url.includes("typescriptlang.org")));
  assert.ok(byId.get("promises-and-async").notes[0].references.some((reference) => reference.url.includes("Callback_function")));
  assert.equal(byId.get("organize-imports").notes[0].kind, "historical-context");
  assert.equal(byId.get("callback-parameters").notes[0].kind, "exception");
});

test("relations resolve to other practices and explain their purpose", () => {
  for (const practice of practices) {
    for (const relation of practice.relations) {
      assert.notEqual(relation.practiceId, practice.id);
      assert.ok(byId.has(relation.practiceId), `${practice.id} -> ${relation.practiceId}`);
      assert.ok(relation.reason.length > 20);
    }
  }
  assert.equal(byId.get("measure-loops").relations.find((relation) => relation.practiceId === "array-methods").kind, "alternative");
});

test("offline notices preserve the complete upstream license text", () => {
  assert.deepEqual(LicenseNoticesSchema.parse(licenseNotices), licenseNotices);
  const paths = { community: "andredesousa-MIT.txt", handbook: "typescript-website-CC-BY-4.0.txt" };
  for (const notice of licenseNotices) {
    assert.equal(notice.license, sources.find((source) => source.id === notice.sourceId).license);
    if (notice.sourceId === "viraj") {
      assert.equal(notice.license, "LicenseRef-Unspecified");
      assert.match(notice.text, /Viraj Shah/);
    } else {
      const fullText = readFileSync(new URL(`../licenses/${paths[notice.sourceId]}`, import.meta.url), "utf8");
      assert.equal(notice.text, fullText);
    }
  }
  assert.equal(licenseNotices.length, sources.length);
});

test("canonical schemas reject malformed enums, legacy fields, empty scopes, and insecure source links", () => {
  const valid = practices[0];
  for (const patch of [
    { id: "Bad ID" },
    { category: "Types" },
    { source: "community" },
    { applicability: { ...valid.applicability, contexts: [] } },
    { applicability: { ...valid.applicability, environments: ["all"] } },
    { citations: [] },
    { citations: [{ ...valid.citations[0], sourceId: "unknown" }] },
    { citations: [{ ...valid.citations[0], url: "http://example.com" }] },
  ]) assert.equal(PracticeSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  assert.equal(SourceSchema.safeParse({ ...sources[0], revision: "aaedb9f" }).success, false);
  assert.equal(SourceSchema.safeParse({ ...sources[0], checkedAt: "2026-02-30" }).success, false);
});

test("canonical schemas reject duplicate array identities", () => {
  const valid = practices[0];
  for (const field of ["tags", "citations", "examples", "relations"]) {
    const changed = copy(valid);
    changed[field].push(copy(changed[field][0]));
    assert.equal(PracticeSchema.safeParse(changed).success, false, field);
  }
  const duplicateContext = copy(valid);
  duplicateContext.applicability.contexts.push(duplicateContext.applicability.contexts[0]);
  assert.equal(PracticeSchema.safeParse(duplicateContext).success, false);
  const duplicateVariant = copy(valid);
  duplicateVariant.examples[0].variants.push({ ...duplicateVariant.examples[0].variants[0], code: "different code" });
  assert.equal(PracticeSchema.safeParse(duplicateVariant).success, false);
  assert.equal(PracticesSchema.safeParse([...practices, practices[0]]).success, false);
  assert.equal(SourcesSchema.safeParse([...sources, sources[0]]).success, false);
  assert.equal(LicenseNoticesSchema.safeParse([...licenseNotices, licenseNotices[0]]).success, false);
});

test("published schema structure exposes taxonomy and array constraints", () => {
  assert.deepEqual(categories.map((item) => item.id), [...categoryIds]);
  assert.deepEqual(contexts.map((item) => item.id), [...contextIds]);
  assert.deepEqual(environments.map((item) => item.id), [...environmentIds]);
  const schema = z.toJSONSchema(PracticeSchema);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.category.enum, [...categoryIds]);
  assert.equal(schema.properties.applicability.properties.contexts.minItems, 1);
  assert.equal(schema.properties.applicability.properties.contexts.uniqueItems, true);
  assert.equal(schema.properties.tags.uniqueItems, true);
});


test("personal Prettier snapshot preserves the approved settings and LF line endings", () => {
  const expected = {
    endOfLine: "lf",
    printWidth: 180,
    tabWidth: 4,
    useTabs: false,
    singleQuote: true,
    trailingComma: "es5",
    bracketSpacing: true,
    arrowParens: "avoid",
    semi: false,
    quoteProps: "as-needed",
    jsxSingleQuote: true,
  };
  const configPath = new URL("../configs/viraj.prettierrc.json", import.meta.url);
  const configText = readFileSync(configPath, "utf8");
  assert.equal(configText.includes("\r"), false);
  assert.deepEqual(JSON.parse(configText), expected);
  const practice = byId.get("viraj-prettier-configuration");
  assert.equal(practice.category, "tooling");
  assert.deepEqual(practice.citations.map(({sourceId, role}) => ({sourceId, role})), [{sourceId: "viraj", role: "origin"}]);
  const example = practice.examples.find(example => example.language === "json");
  const preferred = example.variants.find(variant => variant.role === "prefer");
  assert.deepEqual(JSON.parse(preferred.code), expected);
  const source = sources.find(source => source.id === "viraj");
  assert.equal(source.kind, "personal");
  assert.equal(source.author, "Viraj Shah");
  assert.equal(source.license, "LicenseRef-Unspecified");
  assert.equal(source.licenseUrl, null);
  assert.match(source.revision, /^[a-f0-9]{40}$/);
  assert.equal(source.checkedAt, "2026-11-26");
  assert.ok(source.url.includes(source.revision));
});
