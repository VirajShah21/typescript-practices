import type { Category, Context, Environment, Practice, SourceId } from "./models.ts";

export interface SearchOptions {
  q?: string;
  category?: Category;
  source?: SourceId;
  context?: Context;
  environment?: Environment;
  tag?: string;
  limit?: number;
  offset?: number;
}
export interface SearchMatch { matchedFields: string[]; snippet: string }
interface Field { name: string; text: string; normalized: string; words: Set<string>; weight: number }
interface IndexedPractice { practice: Practice; fields: Field[] }

const stopWords = new Set("a an and are as at be been being by can could did do does doing for from had has have how i if in into is it its me my of on or our should than that the their them there these they this those to us was we were what when where which who why will with would you your instead please need want using about".split(" "));
const aliasSets = [
  ["declaration", "declarations", "dts", "ambient"],
  ["configuration", "config", "tsconfig", "compiler", "setting", "settings"],
  ["strict", "strictness", "implicit", "nullable", "null"],
  ["validate", "validation", "validating", "parse", "parsing", "schema", "check", "checking"],
  ["untrusted", "external", "incoming", "boundary", "boundaries", "input"],
  ["json", "data", "payload"],
  ["callback", "callbacks", "handler", "listener"],
  ["overload", "overloads", "signature", "signatures"],
  ["performance", "fast", "faster", "speed", "optimize", "optimise", "optimization", "bottleneck"],
  ["library", "libraries", "dependency", "dependencies", "package", "framework"],
  ["promise", "promises", "async", "asynchronous", "await"],
  ["immutable", "immutability", "readonly", "mutation"],
  ["type", "types", "typing", "typed"],
  ["boolean", "booleans", "bool"],
  ["browser", "browsers", "dom", "frontend"],
  ["node", "nodejs", "backend"],
];

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}
function normalize(text: string): string {
  return text.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bd\.ts\b/gi, " declaration files ")
    .replace(/\bnode\.js\b/gi, " node ")
    .replace(/!==|===/g, " strict equality ")
    .replace(/!=|==/g, " loose equality ")
    .replace(/java\s*script/gi, " javascript ")
    .replace(/type\s*script/gi, " typescript ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const aliases = new Map<string, Set<string>>();
for (const group of aliasSets) {
  const words = new Set(group.map(stem));
  for (const word of words) aliases.set(word, words);
}

export function normalizedQuery(text = "") {
  return { text: text.trim(), terms: [...new Set(normalize(text).split(/\s+/).filter(word => word && !stopWords.has(word)).map(stem))] };
}

// One insertion, deletion, substitution, or adjacent transposition. Bounded words
// keep technical typo matching predictable without a search service.
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let left = 0;
  while (left < a.length && left < b.length && a[left] === b[left]) left++;
  if (a.length === b.length) {
    return a.slice(left + 1) === b.slice(left + 1) || (
      a[left] === b[left + 1] && a[left + 1] === b[left] && a.slice(left + 2) === b.slice(left + 2)
    );
  }
  return a.length > b.length ? a.slice(left + 1) === b.slice(left) : a.slice(left) === b.slice(left + 1);
}

function field(name: string, text: string, weight: number): Field {
  const normalized = normalize(text);
  return { name, text, normalized, words: new Set(normalized.split(/\s+/).map(stem)), weight };
}
const indexCache = new WeakMap<readonly Practice[], IndexedPractice[]>();
function index(practices: readonly Practice[]) {
  let indexed = indexCache.get(practices);
  if (!indexed) {
    indexed = practices.map(practice => ({
      practice,
      fields: [
        field("title", practice.title, 12),
        field("tags", practice.tags.join(" "), 10),
        field("summary", practice.summary, 7),
        field("applicability", [...practice.applicability.contexts, ...practice.applicability.environments, ...practice.applicability.when, ...practice.applicability.exceptions].join(" "), 5),
        field("source", practice.citations.map(citation => `${citation.sourceId === "handbook" ? "TypeScript Handbook official documentation" : "TypeScript Best Practices community guide"} ${citation.section}`).join(" "), 4),
        field("explanation", practice.explanation, 3),
        field("notes", practice.notes.map(note => note.text).join(" "), 3),
        field("examples", practice.examples.flatMap(example => [example.explanation, ...example.variants.map(variant => variant.code)]).join("\n"), 2),
      ],
    }));
    indexCache.set(practices, indexed);
  }
  return indexed;
}

function strength(term: string, values: Field, fuzzy = false): number {
  if (values.words.has(term)) return 1;
  if (!fuzzy) {
    if ([...(aliases.get(term) || [])].some(word => values.words.has(word))) return .65;
    if (term.length >= 4 && [...values.words].some(word => word.startsWith(term))) return .5;
  } else if (term.length >= 5 && [...values.words].some(word => word.length >= 5 && oneEdit(term, word))) return .4;
  return 0;
}
function excerpt(text: string, terms: string[]): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 220) return compact;
  const lower = compact.toLowerCase();
  const positions = terms.map(term => lower.indexOf(term)).filter(position => position >= 0);
  let start = positions.length ? Math.max(0, Math.min(...positions) - 65) : 0;
  if (start > 0) {
    const boundary = compact.indexOf(" ", start);
    if (boundary >= 0 && boundary < start + 35) start = boundary + 1;
  }
  const end = Math.min(compact.length, start + 220);
  return `${start ? "…" : ""}${compact.slice(start, end).trim()}${end < compact.length ? "…" : ""}`;
}

export function searchCatalogue(practices: readonly Practice[], options: SearchOptions = {}) {
  const query = normalizedQuery(options.q);
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const ranked = index(practices).flatMap(({ practice, fields }, order) => {
    if (options.category && practice.category !== options.category) return [];
    if (options.source && !practice.citations.some(citation => citation.sourceId === options.source)) return [];
    if (options.context && !practice.applicability.contexts.includes(options.context)) return [];
    if (options.environment && !practice.applicability.environments.includes(options.environment)) return [];
    if (options.tag && !practice.tags.includes(options.tag)) return [];
    if (!query.text) return [{ practice, score: 0, order, match: { matchedFields: [], snippet: practice.summary } as SearchMatch }];
    if (!query.terms.length) return [];
    let matched = 0;
    let score = 0;
    const matchingFields = new Set<string>();
    for (const term of query.terms) {
      let hits = fields.map(value => ({ field: value, strength: strength(term, value) })).filter(hit => hit.strength > 0);
      if (!hits.length) hits = fields.map(value => ({ field: value, strength: strength(term, value, true) })).filter(hit => hit.strength > 0);
      if (!hits.length) continue;
      matched++;
      score += Math.max(...hits.map(hit => hit.field.weight * hit.strength));
      for (const hit of hits) matchingFields.add(hit.field.name);
    }
    const minimumMatches = query.terms.length <= 2 ? query.terms.length : Math.ceil(query.terms.length * .7);
    if (matched < minimumMatches) return [];
    score += matched / query.terms.length * 10;
    if (query.terms.includes("handbook") && practice.citations.some(citation => citation.role === "origin" && citation.sourceId === "handbook")) score += 8;
    if (query.terms.includes("community") && practice.citations.some(citation => citation.role === "origin" && citation.sourceId === "community")) score += 8;
    if (normalize(practice.title).includes(query.terms.join(" "))) score += 20;
    const snippetField = fields.find(value => matchingFields.has(value.name) && ["summary", "explanation", "notes", "examples"].includes(value.name));
    return [{ practice, score, order, match: { matchedFields: fields.filter(value => matchingFields.has(value.name)).map(value => value.name), snippet: excerpt(snippetField?.text || practice.summary, query.terms) } }];
  }).sort((a, b) => b.score - a.score || a.order - b.order);
  return {
    matches: ranked.slice(offset, offset + limit).map(({ practice, match }) => ({ practice, match })),
    total: ranked.length,
    limit,
    offset,
    query,
  };
}
