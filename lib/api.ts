import { z } from "zod";
import {
  catalogueMarkdown, getCatalogue, getCatalogueManifest, getPractice, getPractices,
  listPractices, listSources, listTaxonomy, metadata,
} from "./catalog.ts";
import {
  BatchInputSchema, BatchResponseSchema, CatalogueFormatSchema, CatalogueSchema,
  catalogueSchemaDocument, EmptyInputSchema, HealthSchema, ManifestSchema,
  PracticeIdSchema, PracticeResponseSchema, ProblemSchema, SearchInputSchema,
  SearchResponseSchema, SourcesResponseSchema, TaxonomyResponseSchema,
  type Problem,
} from "./contracts.ts";
import { PUBLIC_API_URL } from "./config.ts";
import { createOpenApiDocument } from "./openapi.ts";

export const MAX_BODY_BYTES = 65536;
const baseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Expose-Headers": "ETag, Content-Disposition",
  "X-Content-Type-Options": "nosniff",
};
const titles: Record<number, string> = {
  400: "Bad request", 403: "Forbidden", 404: "Not found", 405: "Method not allowed",
  406: "Not acceptable", 413: "Content too large", 415: "Unsupported media type", 500: "Internal server error",
};
export class RequestProblem extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: Problem["errors"];
  constructor(status: number, code: string, detail: string, errors: Problem["errors"] = []) {
    super(detail);
    this.name = "RequestProblem";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}
export function validationErrors(error: z.ZodError): Problem["errors"] {
  return error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({ parameter: [...issue.path, key].join("."), code: "unknown_parameter", message: `Unknown parameter: ${key}.` }));
    }
    return [{ parameter: issue.path.join("."), code: issue.code, message: issue.message }];
  });
}
export function makeProblem(request: Request | string, status: number, code: string, detail: string, errors: Problem["errors"] = []): Problem {
  const url = new URL(typeof request === "string" ? request : request.url);
  return ProblemSchema.parse({
    type: `urn:typescript-practices:problem:${code}`, title: titles[status] ?? "Request failed", status, detail,
    instance: `${url.pathname}${url.search}`, code, errors,
  });
}
export function problemResponse(request: Request, status: number, code: string, detail: string, errors: Problem["errors"] = [], extraHeaders: Record<string, string> = {}) {
  const body = JSON.stringify(makeProblem(request, status, code, detail, errors));
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers: { ...baseHeaders, "Content-Type": "application/problem+json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}
function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const values: Record<string, unknown> = Object.create(null);
  const errors: Problem["errors"] = [];
  for (const [parameter, value] of new URL(request.url).searchParams) {
    if (Object.hasOwn(values, parameter)) {
      errors.push({ parameter, code: "repeated_parameter", message: `${parameter} must appear only once.` });
      continue;
    }
    values[parameter] = parameter === "limit" || parameter === "offset"
      ? (/^\d+$/.test(value) ? Number(value) : Number.NaN)
      : value;
  }
  if (errors.length) throw new RequestProblem(400, "invalid_query", "Query parameters must not be repeated.", errors);
  const result = schema.safeParse(values);
  if (!result.success) throw new RequestProblem(400, "invalid_query", "One or more query parameters are invalid.", validationErrors(result.error));
  return result.data;
}
export async function readJsonBody(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new RequestProblem(415, "unsupported_media_type", "Content-Type must be application/json.");
  }
  const length = request.headers.get("content-length");
  if (length && Number(length) > MAX_BODY_BYTES) throw new RequestProblem(413, "body_too_large", "Request body exceeds 64 KiB.");
  const reader = request.body?.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let raw = "";
  try {
    if (reader) {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new RequestProblem(413, "body_too_large", "Request body exceeds 64 KiB.");
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    }
  } catch (error) {
    if (error instanceof RequestProblem) throw error;
    throw new RequestProblem(400, "invalid_json", "Request body must contain UTF-8 JSON.");
  } finally { reader?.releaseLock(); }
  try { return JSON.parse(raw); }
  catch { throw new RequestProblem(400, "invalid_json", "Request body must contain valid JSON."); }
}
async function representation(request: Request, text: string, contentType: string, headers: Record<string, string> = {}) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const etag = `"${hash}"`;
  let publicOrigin = false;
  try { publicOrigin = new URL(request.url).origin === new URL(PUBLIC_API_URL).origin; } catch { /* Local portable config remains privately cacheable. */ }
  const outputHeaders = {
    ...baseHeaders, "Content-Type": contentType, "Cache-Control": `${publicOrigin ? "public" : "private"}, no-cache`, ETag: etag, ...headers,
  };
  const conditions = request.headers.get("if-none-match")?.split(",").map((value) => value.trim().replace(/^W\//, "")) ?? [];
  if (conditions.includes("*") || conditions.includes(etag)) return new Response(null, { status: 304, headers: outputHeaders });
  return new Response(request.method === "HEAD" ? null : text, { status: 200, headers: outputHeaders });
}
const jsonRepresentation = (request: Request, body: unknown, contentType = "application/json; charset=utf-8") => representation(request, JSON.stringify(body), contentType);

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const known = path === "/api/health" || path === "/api/v1/health" || [
    "/api/v1/practices", "/api/v1/practices/batch", "/api/v1/taxonomy", "/api/v1/sources", "/api/v1/catalogue", "/api/v1/catalogue/manifest", "/api/v1/schema.json", "/api/v1/openapi.json",
  ].includes(path) || /^\/api\/v1\/practices\/[^/]+$/.test(path);
  if (!known) return problemResponse(request, 404, "not_found", path === "/api/v1/categories" ? "This endpoint has been replaced by /api/v1/taxonomy." : "API endpoint not found.");
  const methods = path === "/api/v1/practices/batch" ? ["POST", "OPTIONS"] : ["GET", "HEAD", "OPTIONS"];
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...baseHeaders, Allow: methods.join(", "), "Cache-Control": "no-store" } });
  if (!methods.includes(request.method)) return problemResponse(request, 405, "method_not_allowed", `Use ${methods.filter((method) => method !== "OPTIONS").join(" or ")} for this endpoint.`, [], { Allow: methods.join(", ") });
  try {
    if (path === "/api/v1/practices") {
      const query = parseQuery(request, SearchInputSchema);
      return await jsonRepresentation(request, SearchResponseSchema.parse(listPractices(query, url.origin)));
    }
    if (path === "/api/v1/catalogue") {
      const { format = "json" } = parseQuery(request, CatalogueFormatSchema);
      if (format === "markdown") return await representation(request, catalogueMarkdown(), "text/markdown; charset=utf-8", { "Content-Disposition": 'attachment; filename="typescript-practices.md"' });
      return await representation(request, JSON.stringify(CatalogueSchema.parse(getCatalogue())), "application/json; charset=utf-8", { "Content-Disposition": 'attachment; filename="typescript-practices.json"' });
    }
    parseQuery(request, EmptyInputSchema);
    if (path === "/api/v1/practices/batch") {
      const parsed = BatchInputSchema.safeParse(await readJsonBody(request));
      if (!parsed.success) throw new RequestProblem(400, "invalid_body", "The batch request is invalid.", validationErrors(parsed.error));
      const body = BatchResponseSchema.parse(getPractices(parsed.data.ids));
      return new Response(JSON.stringify(body), { status: 200, headers: { ...baseHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (/^\/api\/v1\/practices\/[^/]+$/.test(path)) {
      let id: string;
      try { id = decodeURIComponent(path.slice("/api/v1/practices/".length)); }
      catch { throw new RequestProblem(400, "invalid_id", "Practice ID must be valid URL-encoded text.", [{ parameter: "id", code: "invalid_encoding", message: "Invalid URL encoding." }]); }
      const parsed = PracticeIdSchema.safeParse(id);
      if (!parsed.success) throw new RequestProblem(400, "invalid_id", "Practice ID must be a lowercase kebab-case identifier of at most 150 characters.", [{ parameter: "id", code: "invalid_format", message: "Use a lowercase kebab-case practice ID." }]);
      const practice = getPractice(id);
      if (!practice) return problemResponse(request, 404, "practice_not_found", `Practice '${id}' was not found.`);
      return await jsonRepresentation(request, PracticeResponseSchema.parse({ data: practice, meta: { schemaVersion: metadata.schemaVersion, datasetVersion: metadata.datasetVersion } }));
    }
    if (path === "/api/v1/taxonomy") return await jsonRepresentation(request, TaxonomyResponseSchema.parse(listTaxonomy()));
    if (path === "/api/v1/sources") return await jsonRepresentation(request, SourcesResponseSchema.parse(listSources()));
    if (path === "/api/v1/catalogue/manifest") return await jsonRepresentation(request, ManifestSchema.parse(getCatalogueManifest(url.origin)));
    if (path === "/api/v1/schema.json") return await jsonRepresentation(request, catalogueSchemaDocument(url.origin), "application/schema+json; charset=utf-8");
    if (path === "/api/v1/openapi.json") return await jsonRepresentation(request, createOpenApiDocument(url.origin));
    return await jsonRepresentation(request, HealthSchema.parse({ status: "ok", version: "2.0.0", meta: { schemaVersion: metadata.schemaVersion, datasetVersion: metadata.datasetVersion } }));
  } catch (error) {
    if (error instanceof RequestProblem) return problemResponse(request, error.status, error.code, error.message, error.errors);
    return problemResponse(request, 500, "internal_error", "The server could not complete this request.");
  }
}
