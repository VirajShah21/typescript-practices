import practiceData from "../data/practices.json" with { type: "json" };
import sourceData from "../data/sources.json" with { type: "json" };

export const categories = ["Types", "Functions", "Code structure", "Runtime", "Tooling", "Declarations"] as const;
export const sourceIds = ["community", "handbook"] as const;
export type Category = (typeof categories)[number];
export type SourceId = (typeof sourceIds)[number];
export interface Practice {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  category: Category;
  source: SourceId;
  sourceUrl: string;
  sourceTitle: string;
  scope: string;
  tags: string[];
  caveat?: string;
  bad?: string;
  good?: string;
  related: string[];
}
export interface Source {
  id: SourceId;
  title: string;
  author: string;
  url: string;
  license: string;
  licenseUrl: string;
  revision: string;
  checkedAt: string;
}
export const practices = practiceData as Practice[];
export const sources = sourceData as Source[];

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export interface PracticeQuery {
  q?: string;
  category?: Category;
  source?: SourceId;
  limit?: number;
  offset?: number;
}

const queryKeys = new Set(["q", "category", "source", "limit", "offset"]);

export function parseQuery(input: Record<string, unknown>): Required<Pick<PracticeQuery, "q" | "limit" | "offset">> & PracticeQuery {
  for (const key of Object.keys(input)) {
    if (!queryKeys.has(key)) throw new InputError(`Unknown parameter: ${key}.`);
  }
  if (input.q !== undefined && typeof input.q !== "string") throw new InputError("q must be a string.");
  const q = (input.q as string | undefined)?.trim() ?? "";
  if (q.length > 300) throw new InputError("q must contain at most 300 characters.");
  const category = input.category;
  if (category !== undefined && !categories.includes(category as Category)) {
    throw new InputError(`category must be one of: ${categories.join(", ")}.`);
  }
  const source = input.source;
  if (source !== undefined && !sourceIds.includes(source as SourceId)) {
    throw new InputError(`source must be one of: ${sourceIds.join(", ")}.`);
  }
  function integer(name: "limit" | "offset", fallback: number, min: number, max: number): number {
    const value = input[name];
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      throw new InputError(`${name} must be an integer from ${min} to ${max}.`);
    }
    return value;
  }
  return {
    q,
    category: category as Category | undefined,
    source: source as SourceId | undefined,
    limit: integer("limit", 20, 1, 100),
    offset: integer("offset", 0, 0, 100000),
  };
}

export function parseUrlQuery(params: URLSearchParams): ReturnType<typeof parseQuery> {
  const input: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(input, key)) throw new InputError(`Parameter ${key} must appear only once.`);
    input[key] = key === "limit" || key === "offset"
      ? (/^\d+$/.test(value) ? Number(value) : Number.NaN)
      : value;
  }
  return parseQuery(input);
}

function searchScore(practice: Practice, query: string): number {
  if (!query) return 1;
  const title = practice.title.toLocaleLowerCase("en");
  const tags = practice.tags.join(" ").toLocaleLowerCase("en");
  const text = [practice.id, title, practice.summary, practice.explanation, practice.category, practice.scope, practice.caveat ?? "", tags]
    .join(" ").toLocaleLowerCase("en");
  const terms = query.toLocaleLowerCase("en").split(/\s+/).filter(Boolean);
  if (!terms.every((term) => text.includes(term))) return 0;
  return (title.includes(query.toLocaleLowerCase("en")) ? 20 : 0)
    + terms.reduce((score, term) => score + (title.includes(term) ? 5 : 0) + (tags.includes(term) ? 3 : 0), 1);
}

export function listPractices(input: PracticeQuery = {}) {
  const query = parseQuery(input as Record<string, unknown>);
  const matches = practices
    .filter((practice) => (!query.category || practice.category === query.category) && (!query.source || practice.source === query.source))
    .map((practice, index) => ({ practice, score: searchScore(practice, query.q), index }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    data: matches.slice(query.offset, query.offset + query.limit).map((entry) => entry.practice),
    total: matches.length,
    limit: query.limit,
    offset: query.offset,
  };
}

export function getPractice(id: string): Practice | undefined {
  return practices.find((practice) => practice.id === id);
}

export function listCategories() {
  return categories.map((name) => ({ name, count: practices.filter((practice) => practice.category === name).length }));
}
