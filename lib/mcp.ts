import { categories, getPractice, InputError, listCategories, listPractices, parseQuery, sourceIds, sources } from "./catalog.ts";

export const supportedVersions = ["2026-07-28", "2025-06-18", "2025-03-26"];
const MAX_BYTES = 65536;
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const emptySchema = { type: "object", properties: {}, additionalProperties: false };

export const mcpTools = [
  {
    name: "search_practices", title: "Search TypeScript practices",
    description: "Search the curated TypeScript reference. Returns source links, scope, caveats, and code examples. Each whitespace-separated query term must match. Declaration-file advice is specific to declaration design.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        q: { type: "string", maxLength: 300, description: "Search words, such as overload or raw JavaScript" },
        category: { type: "string", enum: categories }, source: { type: "string", enum: sourceIds },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }, offset: { type: "integer", minimum: 0, maximum: 100000, default: 0 },
      },
    }, annotations,
  },
  {
    name: "get_practice", title: "Get a TypeScript practice",
    description: "Get one practice by its stable ID, including explanation, examples, caveats, and attribution.",
    inputSchema: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 150 } } }, annotations,
  },
  { name: "list_categories", title: "List practice categories", description: "List the available categories and the number of practices in each.", inputSchema: emptySchema, annotations },
  { name: "list_sources", title: "List reference sources", description: "Read source attribution, source revisions, review dates, and licenses.", inputSchema: emptySchema, annotations },
];

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function error(id: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function content(value: unknown, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: record(value) ? value : { data: value }, isError };
}

export function handleJsonRpc(payload: unknown): Record<string, unknown> | null {
  if (!record(payload) || payload.jsonrpc !== "2.0" || typeof payload.method !== "string"
    || (payload.id !== undefined && !(typeof payload.id === "string" || (typeof payload.id === "number" && Number.isSafeInteger(payload.id))))
    || (payload.params !== undefined && !record(payload.params))) {
    return error(record(payload) && (typeof payload.id === "string" || typeof payload.id === "number") ? payload.id : null, -32600, "Invalid JSON-RPC request.");
  }
  const { id, method } = payload;
  // Stateless transport accepts notifications without allocating a session.
  if (id === undefined) return null;
  const params = (payload.params ?? {}) as Record<string, unknown>;
  let result: unknown;
  try {
    switch (method) {
      case "server/discover":
        result = { supportedVersions: ["2026-07-28"], capabilities: { tools: {} }, serverInfo: { name: "typescript-practices", version: "1.0.0" } };
        break;
      case "initialize": {
        if (typeof params.protocolVersion !== "string" || !record(params.capabilities) || !record(params.clientInfo)
          || typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") {
          throw new InputError("initialize requires protocolVersion, capabilities, and clientInfo with name and version.");
        }
        result = {
          protocolVersion: supportedVersions.includes(params.protocolVersion) ? params.protocolVersion : "2025-06-18",
          capabilities: { tools: {} }, serverInfo: { name: "typescript-practices", title: "TypeScript Practices", version: "1.0.0" },
          instructions: "Use source and scope fields when applying advice. The handbook entries concern declaration files. Community performance advice includes contextual caveats. This server is read-only.",
        };
        break;
      }
      case "ping": result = {}; break;
      case "tools/list":
        if (params.cursor !== undefined) throw new InputError("This server returns all tools in one page; omit cursor.");
        result = { tools: mcpTools };
        break;
      case "tools/call": {
        if (typeof params.name !== "string" || !mcpTools.some((tool) => tool.name === params.name)) throw new InputError("Unknown tool name.");
        const args = params.arguments ?? {};
        if (!record(args)) throw new InputError("Tool arguments must be an object.");
        if (params.name === "search_practices") result = content(listPractices(parseQuery(args)));
        else if (params.name === "get_practice") {
          if (Object.keys(args).some((key) => key !== "id") || typeof args.id !== "string" || !args.id.trim() || args.id.length > 150) {
            throw new InputError("get_practice requires an id string of 1 to 150 characters and no other arguments.");
          }
          const practice = getPractice(args.id);
          result = practice ? content({ data: practice }) : content({ error: { code: "not_found", message: "Practice not found." } }, true);
        } else {
          if (Object.keys(args).length) throw new InputError("This tool accepts no arguments.");
          result = content({ data: params.name === "list_categories" ? listCategories() : sources });
        }
        break;
      }
      default: return error(id, -32601, "Method not found.");
    }
  } catch (caught) {
    if (caught instanceof InputError) return error(id, -32602, caught.message);
    return error(id, -32603, "Internal server error.");
  }
  return { jsonrpc: "2.0", id, result };
}

function response(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) {
    return response(error(null, -32000, "Origin is not allowed."), 403);
  }
  if (request.method !== "POST") return response(error(null, -32000, "Use POST for this stateless MCP endpoint."), 405, { Allow: "POST" });
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return response(error(null, -32000, "Content-Type must be application/json."), 415);
  }
  const accept = request.headers.get("accept");
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) return response(error(null, -32000, "Accept must include application/json."), 406);
  const protocolVersion = request.headers.get("mcp-protocol-version");
  if (protocolVersion && !supportedVersions.includes(protocolVersion)) return response(error(null, -32000, "Unsupported MCP protocol version."), 400);
  const length = request.headers.get("content-length");
  if (length && Number(length) > MAX_BYTES) return response(error(null, -32000, "Request body exceeds 64 KiB."), 413);
  const reader = request.body?.getReader();
  let bytes = 0;
  let raw = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    if (reader) {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          return response(error(null, -32000, "Request body exceeds 64 KiB."), 413);
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    }
  } catch {
    return response(error(null, -32700, "Request body must contain UTF-8 JSON."), 400);
  } finally { reader?.releaseLock(); }
  let payload: unknown;
  try { payload = JSON.parse(raw); }
  catch { return response(error(null, -32700, "Parse error: invalid JSON."), 400); }
  const result = handleJsonRpc(payload);
  if (result === null) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  return response(result, result.error && (result.error as { code?: number }).code === -32600 ? 400 : 200);
}
