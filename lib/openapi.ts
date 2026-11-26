import { contractSchemas, jsonSchema, SearchInputSchema } from "./contracts.ts";

export function createOpenApiDocument(origin: string) {
  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const json = (schema: unknown, media = "application/json") => ({ [media]: { schema } });
  const error = (description: string) => ({ description, content: json(ref("Problem"), "application/problem+json") });
  const errors = { "400": error("Invalid query, path, or body; errors identify the invalid parameters"), "404": error("Endpoint or practice not found"), "405": error("HTTP method is not allowed"), "500": error("Unexpected server error") };
  const cacheHeaders = { ETag: { description: "Strong SHA-256 ETag for this exact representation", schema: { type: "string" } }, "Cache-Control": { schema: { type: "string" } } };
  const conditionalParameter = { name: "If-None-Match", in: "header", description: "Return 304 when this representation matches the supplied ETag.", schema: { type: "string" } };
  const successful = (name: string, description = "Successful response") => ({ description, headers: cacheHeaders, content: json(ref(name)) });
  const notModified = { description: "The selected representation has not changed", headers: cacheHeaders };
  const searchJson = jsonSchema(SearchInputSchema, true);
  const properties = searchJson.properties as Record<string, unknown>;
  const descriptions: Record<string, string> = {
    q: "Case-insensitive search using normalized technical aliases. One- or two-term queries require every normalized term; longer queries require at least 70 percent. Bounded typo matching is supported; exact IDs and titles rank first. Empty text browses the catalogue.",
    category: "Stable category ID. Discover IDs and labels at /api/v1/taxonomy.",
    source: "Return practices with a citation to this source.",
    context: "Applicability context. Use declaration-file for all declaration guidance, including entries categorized types.",
    environment: "Applicability environment. runtime-independent is an explicit catalogue value.",
    tag: "Lowercase kebab-case tag. A syntactically valid unknown tag returns an empty result.",
    limit: "Maximum results in this page. Default 20; maximum 100.",
    offset: "Results to skip. Default 0. Offset pagination is stable within the returned datasetVersion.",
  };
  const searchParameters = Object.entries(properties).map(([name, schema]) => ({ name, in: "query", description: descriptions[name], schema: { ...(schema as object), ...(name === "limit" ? { default: 20 } : name === "offset" ? { default: 0 } : {}) } }));
  const get = (operationId: string, summary: string, schema: string, extra = {}) => ({ operationId, summary, parameters: [conditionalParameter], responses: { "200": successful(schema), "304": notModified, ...errors }, ...extra });
  return {
    openapi: "3.1.0",
    info: {
      title: "TypeScript Practices API", version: "2.0.0",
      description: "Read-only TypeScript reference data. Schema version 2 is a breaking redesign of the initial catalogue. Search returns compact summaries; detail and batch endpoints return full practices. Every data response identifies its schemaVersion and content-derived datasetVersion. All endpoints reject unknown or repeated query parameters. The public API origin needs no authentication; access to the reference Site is independent. Application and server code are MIT; source content retains its original licenses.",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    tags: [{ name: "Practices" }, { name: "Catalogue" }, { name: "Discovery" }],
    paths: {
      "/api/v1/practices": {
        get: get("searchPractices", "Search compact practice summaries", "SearchResponse", {
          tags: ["Practices"], parameters: [...searchParameters, conditionalParameter],
          description: "Filter fields combine with AND. Source filters match citations. The meta object includes normalized query text/terms, total, limit, offset, hasMore, and nextOffset. An empty match is 200 with data:[]. Full explanations and examples are only returned by detail, batch, or catalogue exports.",
        }),
      },
      "/api/v1/practices/{id}": {
        get: get("getPractice", "Read a full practice", "PracticeResponse", {
          tags: ["Practices"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 150 } }, conditionalParameter],
        }),
      },
      "/api/v1/practices/batch": {
        post: {
          operationId: "getPractices", tags: ["Practices"], summary: "Read 1 to 20 practices in one request",
          description: "IDs must be unique. Found records retain the requested order; missing IDs are returned in missingIds. Missing IDs alone do not make the batch request fail. The response is not cached.",
          requestBody: { required: true, content: json(ref("BatchInput")) },
          responses: { "200": { description: "Found practices and missing IDs", content: json(ref("BatchResponse")) }, ...errors, "413": error("Body exceeds 64 KiB"), "415": error("Content-Type must be application/json") },
        },
      },
      "/api/v1/taxonomy": { get: get("getTaxonomy", "Discover filter IDs, labels, and total catalogue counts", "TaxonomyResponse", { tags: ["Discovery"] }) },
      "/api/v1/sources": { get: get("listSources", "Read original source attribution and licenses", "SourcesResponse", { tags: ["Discovery"] }) },
      "/api/v1/catalogue/manifest": { get: get("getCatalogueManifest", "Read catalogue versions, counts, and download links", "CatalogueManifest", { tags: ["Catalogue"] }) },
      "/api/v1/catalogue": {
        get: {
          operationId: "getCatalogue", tags: ["Catalogue"], summary: "Download the complete catalogue as JSON or Markdown",
          parameters: [{ name: "format", in: "query", schema: { type: "string", enum: ["json", "markdown"], default: "json" } }, conditionalParameter],
          description: "The default JSON snapshot contains schemaVersion, datasetVersion, sources, and full practices. Markdown contains the same guidance with attribution and applicability. Examples are illustrative and not automatically verified.",
          responses: { "200": { description: "Complete catalogue in the selected format", headers: cacheHeaders, content: { ...json(ref("Catalogue")), ...json({ type: "string" }, "text/markdown") } }, "304": notModified, ...errors },
        },
      },
      "/api/v1/schema.json": { get: { operationId: "getSchemas", tags: ["Discovery"], summary: "Read JSON Schema contracts generated from the validation schemas", parameters: [conditionalParameter], responses: { "200": { description: "Draft 2020-12 JSON Schema; Catalogue is the root schema and $defs contains all contracts", headers: cacheHeaders, content: json({ type: "object" }, "application/schema+json") }, "304": notModified, ...errors } } },
      "/api/v1/openapi.json": { get: { operationId: "getOpenApi", tags: ["Discovery"], summary: "Read this OpenAPI specification", parameters: [conditionalParameter], responses: { "200": { description: "OpenAPI 3.1 document", headers: cacheHeaders, content: json({ type: "object" }) }, "304": notModified, ...errors } } },
      "/api/health": { get: get("healthCheck", "Check API and dataset version", "Health", { tags: ["Discovery"] }) },
    },
    components: {
      schemas: Object.fromEntries(Object.entries(contractSchemas).map(([name, schema]) => [name, jsonSchema(schema)])),
      examples: {
        invalidCategory: { value: { type: "urn:typescript-practices:problem:invalid_query", title: "Bad request", status: 400, detail: "One or more query parameters are invalid.", instance: "/api/v1/practices?category=Types", code: "invalid_query", errors: [{ parameter: "category", code: "invalid_value", message: "Use a stable category ID, such as types." }] } },
      },
    },
  };
}
