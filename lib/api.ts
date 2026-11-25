import { getPractice, InputError, listCategories, listPractices, parseUrlQuery, sources } from "./catalog.ts";
import { createOpenApiDocument } from "./openapi.ts";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

export function jsonResponse(value: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...headers, ...extraHeaders } });
}

export function handleApiRequest(request: Request): Response {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ error: { code: "method_not_allowed", message: "Use GET for this endpoint." } }, 405, { Allow: "GET, HEAD, OPTIONS" });
  }
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  let response: Response;
  try {
    if (path === "/api/health") response = jsonResponse({ status: "ok", version: "1.0.0" });
    else if (path === "/api/v1/practices") response = jsonResponse(listPractices(parseUrlQuery(url.searchParams)));
    else if (/^\/api\/v1\/practices\/[^/]+$/.test(path)) {
      let id: string;
      try { id = decodeURIComponent(path.slice("/api/v1/practices/".length)); }
      catch { throw new InputError("Practice ID must be valid URL-encoded text."); }
      const practice = getPractice(id);
      response = practice
        ? jsonResponse({ data: practice })
        : jsonResponse({ error: { code: "not_found", message: "Practice not found." } }, 404);
    } else if (path === "/api/v1/sources") response = jsonResponse({ data: sources });
    else if (path === "/api/v1/categories") response = jsonResponse({ data: listCategories() });
    else if (path === "/api/v1/openapi.json") response = jsonResponse(createOpenApiDocument(url.origin));
    else response = jsonResponse({ error: { code: "not_found", message: "API endpoint not found." } }, 404);
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    response = jsonResponse({ error: { code: "invalid_request", message: error.message } }, 400);
  }
  if (request.method === "HEAD") return new Response(null, { status: response.status, headers: response.headers });
  return response;
}
