import { handleApiRequest, problemResponse } from "../lib/api.ts";
import { handleMcpRequest } from "../lib/mcp.ts";
import { getCatalogueManifest } from "../lib/catalog.ts";
import { REFERENCE_SITE_URL } from "../lib/config.ts";

/** Public deployment contains only the reviewed catalogue and read-only handlers. */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/mcp" || url.pathname === "/mcp") return handleMcpRequest(request);
    if (url.pathname.startsWith("/api/")) return handleApiRequest(request);
    if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
      const body = JSON.stringify({
        service: "TypeScript Practices API", version: "2.0.0", access: "public, read-only",
        reference: REFERENCE_SITE_URL, mcp: `${url.origin}/api/mcp`,
        catalogue: getCatalogueManifest(url.origin),
        examples: { search: `${url.origin}/api/v1/practices?q=untrusted+json`, batch: "POST /api/v1/practices/batch with {\"ids\":[\"validate-data\"]}" },
      });
      return new Response(request.method === "HEAD" ? null : body, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" } });
    }
    return problemResponse(request, 404, "not_found", "Use /api/v1/openapi.json for the API contract or POST /api/mcp for MCP.");
  },
};
