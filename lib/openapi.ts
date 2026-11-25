import { categories, sourceIds } from "./catalog.ts";

export function createOpenApiDocument(origin: string) {
  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const json = (schema: unknown) => ({ "application/json": { schema } });
  const errorResponse = (description: string) => ({ description, content: json(ref("Error")) });
  const listResponse = (name: string) => ({
    description: "Successful response",
    content: json({ type: "object", required: ["data"], properties: { data: { type: "array", items: ref(name) } } }),
  });
  const parameters = [
    { name: "q", in: "query", description: "Literal, case-insensitive search. All whitespace-separated terms must match. Title and tag matches rank first.", schema: { type: "string", maxLength: 300 } },
    { name: "category", in: "query", schema: { type: "string", enum: categories } },
    { name: "source", in: "query", schema: { type: "string", enum: sourceIds } },
    { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
    { name: "offset", in: "query", schema: { type: "integer", minimum: 0, maximum: 100000, default: 0 } },
  ];
  return {
    openapi: "3.1.0",
    info: {
      title: "TypeScript Practices API",
      version: "1.0.0",
      description: "Read-only access to the same curated catalogue used by the site and MCP server. Community advice and declaration-file guidance retain their source and scope. Unknown or repeated search parameters return 400. Access to hosted Sites is controlled by the Site's sharing settings; the standalone server serves public reference data without authentication.",
      license: { name: "MIT (server code); source content retains its original licenses", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    paths: {
      "/api/v1/practices": {
        get: {
          operationId: "searchPractices",
          summary: "Search or browse practices",
          parameters,
          responses: {
            "200": { description: "Matching practices, ordered by relevance and then source order", content: json(ref("PracticeList")) },
            "400": errorResponse("Invalid query parameter"),
          },
        },
      },
      "/api/v1/practices/{id}": {
        get: {
          operationId: "getPractice",
          summary: "Get a practice and its examples",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Practice detail", content: json({ type: "object", required: ["data"], properties: { data: ref("Practice") } }) },
            "400": errorResponse("Invalid URL encoding"),
            "404": errorResponse("Practice not found"),
          },
        },
      },
      "/api/v1/categories": { get: { operationId: "listCategories", summary: "List categories and their practice counts", responses: { "200": listResponse("Category") } } },
      "/api/v1/sources": { get: { operationId: "listSources", summary: "List source attribution, licenses, and revisions", responses: { "200": listResponse("Source") } } },
      "/api/v1/openapi.json": { get: { operationId: "getOpenApi", summary: "Get this OpenAPI document", responses: { "200": { description: "OpenAPI 3.1 document", content: json({ type: "object" }) } } } },
      "/api/health": { get: { operationId: "healthCheck", summary: "Check server health", responses: { "200": { description: "Server is running", content: json({ type: "object", required: ["status", "version"], properties: { status: { const: "ok" }, version: { type: "string" } } }) } } } },
    },
    components: {
      schemas: {
        Practice: {
          type: "object",
          required: ["id", "title", "summary", "explanation", "category", "source", "sourceUrl", "sourceTitle", "scope", "tags", "related"],
          properties: {
            id: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, explanation: { type: "string" },
            category: { type: "string", enum: categories }, source: { type: "string", enum: sourceIds },
            sourceUrl: { type: "string", format: "uri" }, sourceTitle: { type: "string" }, scope: { type: "string" },
            tags: { type: "array", items: { type: "string" } }, caveat: { type: "string" }, bad: { type: "string" }, good: { type: "string" },
            related: { type: "array", items: { type: "string" }, description: "Related practice IDs" },
          },
        },
        PracticeList: {
          type: "object", required: ["data", "total", "limit", "offset"],
          properties: {
            data: { type: "array", items: ref("Practice") }, total: { type: "integer", minimum: 0 },
            limit: { type: "integer", minimum: 1, maximum: 100 }, offset: { type: "integer", minimum: 0 },
          },
        },
        Category: { type: "object", required: ["name", "count"], properties: { name: { type: "string", enum: categories }, count: { type: "integer", minimum: 0 } } },
        Source: {
          type: "object", required: ["id", "title", "author", "url", "license", "licenseUrl", "revision", "checkedAt"],
          properties: {
            id: { type: "string", enum: sourceIds }, title: { type: "string" }, author: { type: "string" },
            url: { type: "string", format: "uri" }, license: { type: "string" }, licenseUrl: { type: "string", format: "uri" },
            revision: { type: "string" }, checkedAt: { type: "string", format: "date" },
          },
        },
        Error: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } } } },
      },
    },
  };
}
