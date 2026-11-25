# TypeScript Practices

A searchable reference that combines André de Sousa’s TypeScript best practices with the TypeScript Handbook’s declaration-file guidelines. The website, REST API, and MCP server use the same catalogue.

The catalogue contains 59 entries: 50 community practices and nine declaration-file guidelines. Each entry includes its source, scope, and explanation. Examples are written for this project. Context notes qualify source advice that is dated or depends on the project, including the claim that raw JavaScript is faster.

## Run the website

Use Node.js 22.13 or later.

```sh
npm install
npm run dev
```

Open the local URL printed by the development server. The website includes search, category and source filters, code examples, and API and MCP setup instructions.

```sh
npm test
npx tsc --noEmit
npm run build
```

The Sites deployment uses the included Vinext and Cloudflare Worker integration. `npm run start` previews a completed Worker build locally. The standalone server below does not need Sites hosting or credentials.

## Run the API and remote MCP server

```sh
node --experimental-strip-types server/http.mjs
```

This starts a Node HTTP server at `http://127.0.0.1:3001`. It serves the API and MCP endpoint using the same handlers as the website. It does not serve the website’s HTML.

Set `PORT` to change the port. `HOST` defaults to `127.0.0.1`. For a public deployment, run it behind HTTPS and set the bind address deliberately. The server reads only the bundled, public catalogue; it does not execute submitted code or access user data.

No additional package is required to run this server on the supported Node version.

## REST API

| Method and path | Result |
| --- | --- |
| `GET /api/v1/practices` | Search and filter the catalogue |
| `GET /api/v1/practices/{id}` | Retrieve a complete practice |
| `GET /api/v1/categories` | List categories |
| `GET /api/v1/sources` | Retrieve source and license metadata |
| `GET /api/v1/openapi.json` | OpenAPI 3.1 specification |

The practice list supports `q`, `category`, `source`, `limit`, and `offset` query parameters. Search is case insensitive and treats input as text rather than a regular expression. Category names are `Types`, `Functions`, `Code structure`, `Runtime`, `Tooling`, and `Declarations`. Source IDs are `community` and `handbook`.

```sh
curl 'http://127.0.0.1:3001/api/v1/practices?q=overload&source=handbook'
curl 'http://127.0.0.1:3001/api/v1/practices/raw-javascript-is-faster'
curl 'http://127.0.0.1:3001/api/v1/openapi.json'
```

List responses use `{ "data": [...], "total": 59, "limit": 20, "offset": 0 }`. The default limit is 20 and the maximum is 100. Offset starts at zero and accepts integers through 100,000. Search accepts up to 300 characters. Unknown or repeated query parameters return `400`.

Single-item and metadata responses use `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "..." } }`; a missing practice returns `404`. Use the OpenAPI response for the complete schemas. Results include source URLs and scope so callers can retain the distinction between application guidance and declaration-file design.

## MCP

The read-only tools are:

| Tool | Purpose |
| --- | --- |
| `search_practices` | Search and filter practices |
| `get_practice` | Read one practice by its stable ID |
| `list_categories` | List available categories |
| `list_sources` | Read source and license metadata |

### Local stdio

The stdio server requires Node.js 22.13 or later. It reads newline-delimited JSON-RPC from stdin and writes only JSON-RPC replies to stdout.

```sh
node --experimental-strip-types server/stdio.mjs
```

For MCP clients that use a `mcpServers` JSON configuration, replace the path below with your checkout’s absolute path:

```json
{
  "mcpServers": {
    "typescript-practices": {
      "command": "node",
      "args": [
        "--experimental-strip-types",
        "/absolute/path/to/typescript-practices/server/stdio.mjs"
      ]
    }
  }
}
```

Configuration syntax depends on the client. The process uses paths relative to its source files, so it does not require a particular working directory.

### Streamable HTTP

Point a client that supports Streamable HTTP at `http://127.0.0.1:3001/mcp`, or your HTTPS deployment’s `/mcp` endpoint. The server returns JSON responses to POST requests, does not open an SSE stream, and does not require session IDs. GET requests return `405 Method Not Allowed`.

Standard clients can initialize with MCP `2025-06-18` or `2025-03-26`. The hosted Sites integration also supports `server/discover` for `2026-07-28`.

```sh
curl 'http://127.0.0.1:3001/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"example","version":"1.0.0"}}}'

curl 'http://127.0.0.1:3001/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_practice","arguments":{"id":"raw-javascript-is-faster"}}}'
```

The transport follows the official [MCP transport specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports) and [initialization lifecycle](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle). Requests have a 64 KiB limit. Browser requests to `/mcp` must have an allowed origin.

### Hosted Sites connection

Publishing this project with the `mcp` capability lets Sites create its own private plugin for the owner. Use that plugin in ChatGPT or Codex. The hosted site’s access policy also applies to its API and MCP endpoint; it is separate from the self-hosted server above. A private Site URL is not a public unauthenticated API endpoint.

## Sources and content updates

- [TypeScript Best Practices — André de Sousa](https://github.com/andredesousa/typescript-best-practices), MIT.
- [TypeScript Handbook: Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html), CC BY 4.0.

The catalogue is a snapshot reviewed on November 25, 2026. It does not synchronize automatically. `data/sources.json` records upstream revisions. To update it, review the upstream sources, revise the matching entries, and update their source metadata and modification notice. Keep stable entry IDs.

## Licenses

Original application and server code is available under the [MIT license](LICENSE). Community-derived guidance retains André de Sousa’s MIT notice. Handbook-derived guidance is adapted under CC BY 4.0 and retains that license. Attribution, modification notices, and full third-party licenses are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/`.

The rewritten summaries, context notes, and project examples are adaptations. Neither upstream author has endorsed this project. Framework and package dependencies retain their own licenses.
