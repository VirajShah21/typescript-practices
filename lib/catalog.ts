import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import practiceData from "../data/practices.json" with { type: "json" };
import sourceData from "../data/sources.json" with { type: "json" };
import noticeData from "../data/license-notices.json" with { type: "json" };
import { LicenseNoticesSchema, PracticesSchema, SourcesSchema, SCHEMA_VERSION } from "./models.ts";
import type { Practice } from "./models.ts";
import { categories, contexts, environments } from "./taxonomy.ts";
import { searchCatalogue } from "./search.ts";
import type { SearchOptions } from "./search.ts";
import { PUBLIC_API_URL, REFERENCE_SITE_URL } from "./config.ts";
import { canonicalJson } from "./canonical-json.ts";

export const practices = PracticesSchema.parse(practiceData);
export const sources = SourcesSchema.parse(sourceData);
export const licenseNotices = LicenseNoticesSchema.parse(noticeData);
const practiceIds = new Set(practices.map(practice => practice.id));
const knownSources = new Set(sources.map(source => source.id));
for (const practice of practices) {
  if (!practice.citations.some(citation => citation.role === "origin")) throw new Error(`Practice ${practice.id} must identify its originating source.`);
  for (const citation of practice.citations) {
    if (!knownSources.has(citation.sourceId)) throw new Error(`Unknown source ${citation.sourceId} in ${practice.id}.`);
  }
  for (const relation of practice.relations) {
    if (!practiceIds.has(relation.practiceId) || relation.practiceId === practice.id) throw new Error(`Invalid relation ${relation.practiceId} in ${practice.id}.`);
  }
}
for (const source of sources) {
  const notice = licenseNotices.find(item => item.sourceId === source.id);
  if (!notice || notice.license !== source.license) throw new Error(`Source ${source.id} must include its full matching license notice.`);
}

const datasetVersion = `sha256:${bytesToHex(sha256(new TextEncoder().encode(canonicalJson({ schemaVersion: SCHEMA_VERSION, sources, practices, licenseNotices }))))}`;
export const metadata = Object.freeze({ schemaVersion: SCHEMA_VERSION, datasetVersion, practiceCount: practices.length, sourceCount: sources.length });
function meta() { return { schemaVersion: metadata.schemaVersion, datasetVersion: metadata.datasetVersion }; }

export function referenceSiteOrigin(_origin = REFERENCE_SITE_URL): string {
  // The standalone HTTP API does not serve article pages. Link every transport
  // to the canonical reference rather than to its own API-only origin.
  return REFERENCE_SITE_URL;
}

export function listPractices(options: SearchOptions = {}, origin = REFERENCE_SITE_URL) {
  const result = searchCatalogue(practices, options);
  const nextOffset = result.offset + result.matches.length;
  return {
    data: result.matches.map(({ practice, match }) => ({
      id: practice.id, title: practice.title, summary: practice.summary, category: practice.category,
      contexts: practice.applicability.contexts, environments: practice.applicability.environments,
      sourceIds: [...new Set(practice.citations.map(citation => citation.sourceId))], tags: practice.tags,
      match,
      links: { self: `/api/v1/practices/${practice.id}`, page: `${referenceSiteOrigin(origin)}/?practice=${practice.id}` },
    })),
    meta: { ...meta(), total: result.total, limit: result.limit, offset: result.offset, hasMore: nextOffset < result.total, nextOffset: nextOffset < result.total ? nextOffset : null, query: result.query },
  };
}

export function getPractice(id: string): Practice | undefined { return practices.find(practice => practice.id === id); }
export function getPractices(ids: string[]) {
  const data: Practice[] = [];
  const missingIds: string[] = [];
  for (const id of ids) {
    const practice = getPractice(id);
    if (practice) data.push(practice);
    else missingIds.push(id);
  }
  return { data, missingIds, meta: meta() };
}
export function listSources() { return { data: sources, meta: meta() }; }
export function listTaxonomy() {
  const tags = [...new Set(practices.flatMap(practice => practice.tags))].sort();
  return {
    data: {
      categories: categories.map(item => ({ ...item, count: practices.filter(practice => practice.category === item.id).length })),
      contexts: contexts.map(item => ({ ...item, count: practices.filter(practice => practice.applicability.contexts.includes(item.id)).length })),
      environments: environments.map(item => ({ ...item, count: practices.filter(practice => practice.applicability.environments.includes(item.id)).length })),
      tags: tags.map(id => ({ id, label: id, count: practices.filter(practice => practice.tags.includes(id)).length })),
      sources: sources.map(source => ({ id: source.id, label: source.title, count: practices.filter(practice => practice.citations.some(citation => citation.sourceId === source.id)).length })),
    },
    meta: meta(),
  };
}
export function getCatalogue() { return { ...meta(), sources, practices, licenseNotices }; }
export function getCatalogueManifest(origin = PUBLIC_API_URL) {
  const base = new URL(origin).origin;
  return { ...metadata, links: { json: `${base}/api/v1/catalogue`, markdown: `${base}/api/v1/catalogue?format=markdown`, schema: `${base}/api/v1/schema.json`, openapi: `${base}/api/v1/openapi.json` } };
}

function label(items: readonly { id: string; label: string }[], id: string) { return items.find(item => item.id === id)?.label || id; }
function fence(code: string, language = "") {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map(match => match[0].length));
  const marker = "`".repeat(longest + 1);
  return `${marker}${language}\n${code}\n${marker}`;
}
export function catalogueMarkdown(): string {
  const lines = ["# TypeScript Practices", "", `Schema version: ${metadata.schemaVersion}`, `Dataset version: ${metadata.datasetVersion}`, "", "This is a reviewed snapshot. Examples are illustrative fragments, not verified executable programs.", "", "## Sources", ""];
  for (const source of sources) {
    const license = source.licenseUrl ? `[${source.license}](${source.licenseUrl})` : "Not specified";
    lines.push(`- [${source.title}](${source.url}), by ${source.author}. Kind: ${source.kind}${source.kind === "personal" ? " (opinionated preferences)" : ""}. License: ${license}. Revision: ${source.revision}. Source checked: ${source.checkedAt}.`);
    if (source.provenance) lines.push(`  ${source.provenance}`);
  }
  for (const practice of practices) {
    lines.push("", `## ${practice.title}`, "", `ID: ${practice.id}`, `Category: ${label(categories, practice.category)}`, "", practice.summary, "", practice.explanation, "", `Contexts: ${practice.applicability.contexts.map(id => label(contexts, id)).join(", ")}`, `Environments: ${practice.applicability.environments.map(id => label(environments, id)).join(", ")}`);
    if (practice.applicability.when.length) lines.push("", "### Applies when", "", ...practice.applicability.when.map(text => `- ${text}`));
    if (practice.applicability.exceptions.length) lines.push("", "### Exceptions", "", ...practice.applicability.exceptions.map(text => `- ${text}`));
    for (const note of practice.notes) {
      lines.push("", `### ${note.kind.replace(/-/g, " ")}`, "", note.text);
      for (const reference of note.references) lines.push(`- [${reference.title}](${reference.url})`);
    }
    for (const example of practice.examples) {
      lines.push("", `### Example: ${example.id}`, "", example.explanation, "", "Verification: illustrative.");
      for (const variant of example.variants) lines.push("", `**${variant.role}**`, "", fence(variant.code, example.language));
    }
    lines.push("", "### Citations", "");
    for (const citation of practice.citations) {
      const source = sources.find(item => item.id === citation.sourceId)!;
      const license = source.licenseUrl ? `[${source.license}](${source.licenseUrl})` : "License not specified";
      lines.push(`- [${citation.section}](${citation.url}) — ${source.title}; ${citation.role}; ${license}.`);
    }
    if (practice.relations.length) lines.push("", "### Related practices", "", ...practice.relations.map(relation => `- ${relation.practiceId} (${relation.kind}): ${relation.reason}`));
  }
  lines.push("", "## Redistribution and modifications", "", "Community-origin practices retain André de Sousa’s MIT notice. Handbook-origin practices are adapted under CC BY 4.0 and credited to Microsoft and TypeScript contributors. Changes include rewritten summaries and explanations, new examples, grouping, structured applicability, and editorial corrections. Viraj Shah’s personal configurations are included with his approval and has no separately specified content license. Supporting citations do not imply endorsement. Keep all source attribution, license notices, and modification details when redistributing.", "", "## Full license notices");
  for (const notice of licenseNotices) lines.push("", `### ${notice.sourceId}: ${notice.license}`, "", fence(notice.text));
  return `${lines.join("\n")}\n`;
}
