# TypeScript Practices

A searchable TypeScript reference with a REST API, an MCP server, and downloadable JSON and Markdown catalogues. All interfaces use the same validated dataset and search implementation.

- [Reference site](https://typescript-practices-reference.shahvirajd.chatgpt.site)
- [Public API specification](https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/openapi.json)
- [Catalogue manifest and download links](https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/catalogue/manifest)

The reference site retains its own access settings. The separate public API and MCP service can be used without signing in to the Site.

The catalogue contains 59 practices: 50 originating in André de Sousa’s guide and nine originating in the TypeScript Handbook’s declaration-file guidelines. Supporting citations can connect a practice to either source. Each practice includes structured applicability, conditions and exceptions, citations, editorial notes, examples, and related practices.

## Install and run

Use Node.js 22.13 or later. Install dependencies before running the website, HTTP server, or stdio server. Runtime validation uses Zod.

```sh
npm ci
npm run dev
```

Open the URL printed by the development server.

```sh
npm test
npm run typecheck
npm run build
```

The website uses Vinext and a Cloudflare Worker. `npm run start` previews a completed Worker build locally. The standalone servers below use the same catalogue and handlers without requiring Sites hosting or credentials.

## REST API

Public base URL: `https://typescript-practices-api.shahvirajd.chatgpt.site`.

| Method and path | Result |
| --- | --- |
| `GET /api/v1/practices` | Search compact practice summaries |
| `GET /api/v1/practices/{id}` | Retrieve a complete practice |
| `POST /api/v1/practices/batch` | Retrieve up to 20 practices by ID |
| `GET /api/v1/taxonomy` | List category, context, environment, tag, and source IDs |
| `GET /api/v1/sources` | Retrieve source revisions, attribution, and licenses |
| `GET /api/v1/catalogue?format=json` | Download the complete structured catalogue |
| `GET /api/v1/catalogue?format=markdown` | Download the complete readable catalogue |
| `GET /api/v1/catalogue/manifest` | Read dataset version, counts, and download links |
| `GET /api/v1/schema.json` | JSON Schema for the catalogue and API contracts |
| `GET /api/v1/openapi.json` | OpenAPI specification |

### Search

```sh
curl 'https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/practices?q=overload&context=declaration-file&limit=2'
```

Supported query parameters:

| Parameter | Values |
| --- | --- |
| `q` | Search text, up to 300 characters |
| `category` | `types`, `functions`, `code-structure`, `runtime`, `tooling`, `declarations` |
| `source` | `community` or `handbook`; matches any citation to that source |
| `context` | `application`, `declaration-file`, `public-api`, `compiler-configuration` |
| `environment` | `browser`, `node`, `runtime-independent` |
| `tag` | An exact tag ID; discover IDs through `/taxonomy` |
| `limit` | Integer from 1 to 100; default 20 |
| `offset` | Integer from 0 to 100,000; default 0 |

Search normalizes case, punctuation, common technical aliases, and limited spelling errors. Results are ranked deterministically. The website, REST API, and MCP tools share this implementation. A valid tag with no matches returns an empty list. Unknown or repeated query parameters are rejected.

Search returns compact summaries rather than complete practices:

```json
{
  "data": [
    {
      "id": "practice-id",
      "title": "Practice title",
      "summary": "Short guidance.",
      "category": "types",
      "contexts": ["application"],
      "environments": ["runtime-independent"],
      "sourceIds": ["community"],
      "tags": ["tag-id"],
      "match": {
        "matchedFields": ["summary"],
        "snippet": "The matching passage."
      },
      "links": {
        "self": "/api/v1/practices/practice-id",
        "page": "https://typescript-practices-reference.shahvirajd.chatgpt.site/?practice=practice-id"
      }
    }
  ],
  "meta": {
    "schemaVersion": "2",
    "datasetVersion": "sha256:<content hash>",
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false,
    "nextOffset": null,
    "query": { "text": "search text", "terms": ["search", "text"] }
  }
}
```

This example illustrates the response shape. Read `links.self` or use a stable practice ID to fetch full content. Use `meta.nextOffset` when `meta.hasMore` is true.

### Full practices and batches

```sh
curl 'https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/practices/raw-javascript-is-faster'

curl 'https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/practices/batch' \
  -H 'Content-Type: application/json' \
  -d '{"ids":["raw-javascript-is-faster","use-utility-types"]}'
```

A detail response uses `{ "data": <practice>, "meta": <version metadata> }`. A batch accepts 1–20 unique IDs and returns `{ "data": [...], "missingIds": [...], "meta": ... }`. Found practices preserve the requested order; unknown IDs appear in `missingIds`. A single missing practice returns `404`.

A full practice contains:

- `id`, `title`, `summary`, `explanation`, a category ID, and tags.
- `applicability.contexts`, `applicability.environments`, conditions in `when`, and `exceptions`.
- `citations` with a source ID, section, URL, and `origin` or `supports` role.
- `notes` classified as `editorial-correction`, `exception`, or `historical-context`, with supporting references.
- `examples` with a language, role-labelled variants, an explanation, and verification status.
- `relations` with a practice ID, relationship kind, and reason.

Examples are illustrative fragments. The verification status does not claim that they are complete or automatically tested programs.

### Versions, schemas, and errors

Current catalogue schema: `2`. Responses carry a content-derived SHA-256 `datasetVersion`. To verify it, recursively sort object keys in `{schemaVersion, sources, practices, licenseNotices}`, preserve array order, serialize compact JSON with UTF-8, and hash those bytes. The reference implementation is `canonicalJson` in `lib/canonical-json.ts`; the version field itself is excluded. The manifest also provides practice and source counts and links to complete downloads and schemas. JSON and Markdown exports retain source attribution, modification details, and full source license notices.

GET responses support strong `ETag` values and conditional `If-None-Match` requests with `304 Not Modified`. Keep the version metadata when caching or distributing a snapshot.

REST errors use `application/problem+json`:

```json
{
  "type": "urn:typescript-practices:problem:invalid_query",
  "title": "Bad request",
  "status": 400,
  "detail": "One or more query parameters are invalid.",
  "instance": "/api/v1/practices?limit=0",
  "code": "invalid_query",
  "errors": [
    { "parameter": "limit", "code": "too_small", "message": "Validation message." }
  ]
}
```

Consult the [OpenAPI document](https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/openapi.json) and [JSON Schema](https://typescript-practices-api.shahvirajd.chatgpt.site/api/v1/schema.json) for exact schemas and constraints. Runtime inputs and outputs use the same contracts.

## MCP

Public Streamable HTTP endpoint: `https://typescript-practices-api.shahvirajd.chatgpt.site/api/mcp`. The public service uses `/api/mcp` because Sites reserves `/mcp` for its authenticated plugin. Self-hosted Node servers use `/mcp`.

All six tools are read-only and declare input and output schemas:

| Tool | Purpose |
| --- | --- |
| `search_practices` | Search compact summaries using the REST search filters and pagination |
| `get_practice` | Retrieve one complete practice by `id` |
| `get_practices` | Retrieve up to 20 complete practices using `ids` |
| `get_taxonomy` | Discover filter IDs, labels, and counts |
| `list_sources` | Read source metadata, revisions, and licenses |
| `get_catalogue_manifest` | Get version metadata and complete catalogue download links |

Successful tools return typed `structuredContent` and JSON text. Tool execution or argument failures set `isError: true` and return Problem Details in text content. Protocol errors use JSON-RPC errors.

For clients that use a `mcpServers` JSON configuration:

```json
{
  "mcpServers": {
    "typescript-practices": {
      "url": "https://typescript-practices-api.shahvirajd.chatgpt.site/api/mcp"
    }
  }
}
```

Client configuration formats vary. The server returns JSON to POST requests, does not open an SSE stream, and does not require session IDs. GET on the MCP endpoint returns `405`. Supported initialization versions include `2025-06-18` and `2025-03-26`; the Sites integration also supports `server/discover` for `2026-07-28`.

### Hosted Site plugin

The reference site’s Sites plugin is a separate connection for ChatGPT or Codex. Install it under Plugins → Personal → Created by you. It follows the reference site’s access settings. Generic clients can use the public endpoint above, or a self-hosted instance.

## Standalone servers

Install dependencies first:

```sh
npm ci
npm run api:serve
```

The HTTP server listens at `http://127.0.0.1:3001`. It serves the API and `/mcp`, using the same code as the hosted service. It does not serve the website’s HTML. `PORT` changes the port; `HOST` defaults to `127.0.0.1`. A public self-hosted deployment should use HTTPS.

For local stdio:

```sh
npm run mcp:stdio
```

In an MCP client, use an absolute path to the checked-out server:

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

The stdio server reads newline-delimited JSON-RPC from stdin and writes only JSON-RPC replies to stdout. It resolves data relative to its source files and does not require a particular working directory. HTTP and stdio requests have a 64 KiB message limit.

## Sources and content updates

- [TypeScript Best Practices — André de Sousa](https://github.com/andredesousa/typescript-best-practices), MIT.
- [TypeScript Handbook: Do’s and Don’ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html), CC BY 4.0.

The source snapshot was reviewed on November 25, 2026. It does not synchronize automatically. `data/sources.json` records upstream revisions and check dates. Preserve those dates when changing the presentation or adding editorial structure; update them when reviewing the sources again.

`lib/models.ts` defines the structured content schemas. `lib/catalog.ts` validates the data and cross-references at load time. `lib/search.ts` provides shared search. `lib/contracts.ts` defines API and MCP contracts, and generates the machine-readable schemas.

## Licenses

Original application, API, and MCP server code is available under the [MIT license](LICENSE). Community-derived guidance retains André de Sousa’s MIT notice. Handbook-derived guidance is adapted under CC BY 4.0 and retains that license. Attribution, modification notices, and full third-party licenses are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), `licenses/`, and the downloadable catalogue.

Rewritten summaries, editorial notes, and project examples are adaptations. Neither upstream author has endorsed this project. Framework and package dependencies retain their own licenses.
