import { z } from "zod";
import { getCatalogueManifest, getPractice, getPractices, listPractices, listSources, listTaxonomy, metadata } from "./catalog.ts";
import {
  BatchInputSchema, BatchResponseSchema, EmptyInputSchema, jsonSchema, ManifestSchema,
  PracticeInputSchema, PracticeResponseSchema, SearchInputSchema, SearchResponseSchema,
  SourcesResponseSchema, TaxonomyResponseSchema, type Problem,
} from "./contracts.ts";
import { makeProblem, readJsonBody, RequestProblem, validationErrors } from "./api.ts";
import { PUBLIC_API_URL } from "./config.ts";

export const supportedVersions = ["2026-07-28", "2025-06-18", "2025-03-26"];
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const meta = () => ({ schemaVersion: metadata.schemaVersion, datasetVersion: metadata.datasetVersion });
type ToolDefinition = {
  name: string; title: string; description: string; input: z.ZodType; output: z.ZodType;
  run: (args: unknown, origin: string) => unknown;
};
const definitions: ToolDefinition[] = [
  {
    name: "search_practices", title: "Search TypeScript practices",
    description: "Search compact practice summaries using words, category/source/context/environment/tag filters, and offset pagination. Normalized one- or two-term queries require every term; longer queries require at least 70 percent of the terms. Technical aliases and bounded typo matching are supported. Use get_practice or get_practices for full content. A valid unknown tag returns no results.",
    input: SearchInputSchema, output: SearchResponseSchema,
    run: (args, origin) => listPractices(args as z.infer<typeof SearchInputSchema>, origin),
  },
  {
    name: "get_practice", title: "Get a TypeScript practice",
    description: "Get one practice by stable ID, including applicability, source citations, editorial notes, examples, and typed relations. Examples are illustrative and have not been automatically verified.",
    input: PracticeInputSchema, output: PracticeResponseSchema,
    run: (args) => {
      const id = (args as z.infer<typeof PracticeInputSchema>).id;
      const practice = getPractice(id);
      if (!practice) throw new RequestProblem(404, "practice_not_found", `Practice '${id}' was not found.`);
      return { data: practice, meta: meta() };
    },
  },
  {
    name: "get_practices", title: "Get multiple TypeScript practices",
    description: "Retrieve 1 to 20 unique practice IDs in the requested order. Missing IDs are returned separately in missingIds.",
    input: BatchInputSchema, output: BatchResponseSchema,
    run: (args) => getPractices((args as z.infer<typeof BatchInputSchema>).ids),
  },
  {
    name: "get_taxonomy", title: "Get reference filters",
    description: "Discover stable IDs, labels, and total catalogue counts for categories, contexts, environments, tags, and sources. Context declaration-file selects practices applicable to declaration files, including handbook guidance categorized as types and relevant community practices.",
    input: EmptyInputSchema, output: TaxonomyResponseSchema, run: () => listTaxonomy(),
  },
  {
    name: "list_sources", title: "List reference sources",
    description: "Read source attribution, kind, licenses, immutable revisions, and check dates. Personal sources contain opinionated preferences from the named author. LicenseRef-Unspecified means no separate content license has been specified; licenseUrl is null in that case.",
    input: EmptyInputSchema, output: SourcesResponseSchema, run: () => listSources(),
  },
  {
    name: "get_catalogue_manifest", title: "Get catalogue download links",
    description: "Get the dataset version, counts, and download links for the complete JSON or Markdown catalogue, JSON Schema, and OpenAPI document. Fetch the linked export when the entire catalogue is needed.",
    input: EmptyInputSchema, output: ManifestSchema, run: (_args, origin) => getCatalogueManifest(origin),
  },
];
export const mcpTools = definitions.map(({ name, title, description, input, output }) => ({
  name, title, description, inputSchema: jsonSchema(input, true), outputSchema: jsonSchema(output), annotations,
}));
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function error(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}
function successContent(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value, isError: false };
}
function toolError(problem: Problem) {
  // Tool errors use Problem Details text; the success-only outputSchema describes structuredContent.
  return { content: [{ type: "text", text: JSON.stringify(problem) }], isError: true };
}

export function handleJsonRpc(payload: unknown, origin = PUBLIC_API_URL): Record<string, unknown> | null {
  if (!record(payload) || payload.jsonrpc !== "2.0" || typeof payload.method !== "string"
    || (payload.id !== undefined && !(typeof payload.id === "string" || (typeof payload.id === "number" && Number.isSafeInteger(payload.id))))
    || (payload.params !== undefined && !record(payload.params))) {
    return error(record(payload) && (typeof payload.id === "string" || typeof payload.id === "number") ? payload.id : null, -32600, "Invalid JSON-RPC request.");
  }
  const { id, method } = payload;
  if (id === undefined) return null;
  const params = (payload.params ?? {}) as Record<string, unknown>;
  let result: unknown;
  switch (method) {
    case "server/discover":
      result = { supportedVersions: ["2026-07-28"], capabilities: { tools: {} }, serverInfo: { name: "typescript-practices", version: "2.0.0" } };
      break;
    case "initialize":
      if (typeof params.protocolVersion !== "string" || !record(params.capabilities) || !record(params.clientInfo)
        || typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") {
        return error(id, -32602, "initialize requires protocolVersion, capabilities, and clientInfo with name and version.");
      }
      result = {
        protocolVersion: supportedVersions.includes(params.protocolVersion) ? params.protocolVersion : "2025-06-18",
        capabilities: { tools: {} }, serverInfo: { name: "typescript-practices", title: "TypeScript Practices", version: "2.0.0" },
        instructions: "Search returns compact summaries. Fetch details or a batch to read guidance. Apply contexts, environments, exceptions, and editorial corrections; preserve source citations. Examples are illustrative. All tools are read-only. Use the manifest for complete catalogue downloads.",
      };
      break;
    case "ping": result = {}; break;
    case "tools/list":
      if (Object.keys(params).some((key) => key !== "_meta")) return error(id, -32602, "tools/list accepts only optional _meta; all tools fit in one page.");
      result = { tools: mcpTools };
      break;
    case "tools/call": {
      if (typeof params.name !== "string" || Object.keys(params).some((key) => !["name", "arguments", "_meta"].includes(key))) {
        return error(id, -32602, "tools/call requires a tool name and optional arguments.");
      }
      const definition = definitions.find((tool) => tool.name === params.name);
      if (!definition) return error(id, -32602, "Unknown tool name.");
      const parsed = definition.input.safeParse(Object.hasOwn(params, "arguments") ? params.arguments : {});
      if (!parsed.success) {
        result = toolError(makeProblem(`${origin}/mcp`, 400, "invalid_arguments", "One or more tool arguments are invalid.", validationErrors(parsed.error)));
        break;
      }
      try {
        const output = definition.output.parse(definition.run(parsed.data, origin));
        result = successContent(output);
      } catch (caught) {
        result = caught instanceof RequestProblem
          ? toolError(makeProblem(`${origin}/mcp`, caught.status, caught.code, caught.message, caught.errors))
          : toolError(makeProblem(`${origin}/mcp`, 500, "internal_error", "The server could not complete this tool call."));
      }
      break;
    }
    default: return error(id, -32601, "Method not found.");
  }
  return { jsonrpc: "2.0", id, result };
}
function response(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
export async function handleMcpRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(request.url).origin) return response(error(null, -32000, "Origin is not allowed."), 403);
  if (request.method !== "POST") return response(error(null, -32000, "Use POST for this stateless MCP endpoint."), 405, { Allow: "POST" });
  if (new URL(request.url).search) return response(error(null, -32602, "This MCP endpoint accepts no query parameters."), 400);
  const accept = request.headers.get("accept");
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) return response(error(null, -32000, "Accept must include application/json."), 406);
  const protocolVersion = request.headers.get("mcp-protocol-version");
  if (protocolVersion && !supportedVersions.includes(protocolVersion)) return response(error(null, -32000, "Unsupported MCP protocol version."), 400);
  let payload: unknown;
  try { payload = await readJsonBody(request); }
  catch (caught) {
    if (caught instanceof RequestProblem) return response(error(null, caught.code === "invalid_json" ? -32700 : -32000, caught.message), caught.status);
    return response(error(null, -32603, "Internal server error."), 500);
  }
  const result = handleJsonRpc(payload, new URL(request.url).origin);
  if (result === null) return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  return response(result, result.error && (result.error as { code?: number }).code === -32600 ? 400 : 200);
}
