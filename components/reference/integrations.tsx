"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Braces,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FileJson,
  LoaderCircle,
  LockKeyhole,
  Plug,
  Search,
  Server,
  Terminal,
} from "lucide-react";
import { CodeBlock, CopyButton, Github } from "./primitives";
import { PUBLIC_API_URL, PUBLIC_MCP_URL } from "../../lib/config.ts";
import "./integrations.css";

const REPO_URL = "https://github.com/VirajShah21/typescript-practices";

const tabs = [
  { id: "rest", label: "REST API", icon: Braces },
  { id: "mcp", label: "MCP server", icon: Plug },
  { id: "self-host", label: "Self-host", icon: Server },
] as const;

type Tab = (typeof tabs)[number]["id"];
type ApiResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; body: string; status: number; duration: number; count: number; total: number }
  | { state: "error"; message: string; status?: number };

const endpoints = [
  { method: "GET", path: "/api/v1/practices", description: "Search compact practice summaries", href: "/api/v1/practices?limit=2" },
  { method: "GET", path: "/api/v1/practices/{id}", description: "Read a complete practice", href: "/api/v1/practices/raw-javascript-is-faster" },
  { method: "POST", path: "/api/v1/practices/batch", description: "Read up to 20 practices by ID", href: "/api/v1/openapi.json" },
  { method: "GET", path: "/api/v1/taxonomy", description: "List categories, contexts, environments, and tags", href: "/api/v1/taxonomy" },
  { method: "GET", path: "/api/v1/sources", description: "Read attribution and source metadata", href: "/api/v1/sources" },
  { method: "GET", path: "/api/v1/catalogue", description: "Download JSON or Markdown", href: "/api/v1/catalogue?format=json" },
  { method: "GET", path: "/api/v1/catalogue/manifest", description: "Read dataset version and integrity metadata", href: "/api/v1/catalogue/manifest" },
  { method: "GET", path: "/api/v1/schema.json", description: "Get the machine-readable catalogue schema", href: "/api/v1/schema.json" },
  { method: "GET", path: "/api/v1/openapi.json", description: "Get the OpenAPI specification", href: "/api/v1/openapi.json" },
];

const tools = [
  { name: "search_practices", description: "Search compact results with match information and filters." },
  { name: "get_practice", description: "Read one practice with examples, conditions, and citations." },
  { name: "get_practices", description: "Read up to 20 practices by ID, in the requested order." },
  { name: "get_taxonomy", description: "Read categories, contexts, environments, and tags." },
  { name: "list_sources", description: "Read source attribution, revisions, and licenses." },
  { name: "get_catalogue_manifest", description: "Read dataset version, counts, and integrity metadata." },
];

type CatalogueMetadata = {
  schemaVersion: string;
  datasetVersion: string;
  practiceCount: number;
  sourceCount: number;
};

const remoteConfig = JSON.stringify({
  mcpServers: {
    "typescript-practices": { url: PUBLIC_MCP_URL },
  },
}, null, 2);

const stdioConfig = JSON.stringify({
  mcpServers: {
    "typescript-practices": {
      command: "node",
      args: [
        "--experimental-strip-types",
        "/absolute/path/to/typescript-practices/server/stdio.mjs",
      ],
    },
  },
}, null, 2);

function responseMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("detail" in value) || typeof value.detail !== "string") return undefined;
  const errors = "errors" in value && Array.isArray(value.errors)
    ? value.errors.flatMap(error => error && typeof error === "object" && "message" in error && typeof error.message === "string" ? [error.message] : [])
    : [];
  return [value.detail, ...errors].join(" ");
}

export default function Integrations({ origin, metadata }: { origin: string; metadata: CatalogueMetadata }) {
  const [tab, setTab] = useState<Tab>("rest");
  const [query, setQuery] = useState("unknown");
  const [source, setSource] = useState("all");
  const [result, setResult] = useState<ApiResult>({ state: "idle" });
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  const searchParams = new URLSearchParams({ q: query, limit: "2" });
  if (source !== "all") searchParams.set("source", source);
  const requestPath = `/api/v1/practices?${searchParams}`;

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabButtons.current[next]?.focus();
  }

  async function runRequest() {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setResult({ state: "loading" });
    const started = performance.now();

    try {
      const response = await fetch(requestPath, { signal: controller.signal });
      const text = await response.text();
      if (controller.signal.aborted) return;
      let value: unknown;
      try { value = JSON.parse(text); } catch { value = undefined; }
      if (!response.ok) {
        setResult({
          state: "error",
          status: response.status,
          message: responseMessage(value) ?? `The request failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}. Try again or check your site access.`,
        });
        return;
      }
      if (!value || typeof value !== "object" || !("data" in value) || !Array.isArray(value.data)) {
        setResult({ state: "error", message: "The API returned an unexpected response. Try again." });
        return;
      }
      setResult({
        state: "success",
        body: JSON.stringify(value, null, 2),
        status: response.status,
        duration: Math.round(performance.now() - started),
        count: value.data.length,
        total: "meta" in value && value.meta && typeof value.meta === "object" && "total" in value.meta && typeof value.meta.total === "number" ? value.meta.total : value.data.length,
      });
    } catch {
      if (!controller.signal.aborted) {
        setResult({ state: "error", message: "Could not reach the API. Check your connection and try again." });
      }
    }
  }

  return (
    <div className="integrations-page">
      <header className="integrations-heading">
        <h1>API & MCP</h1>
        <p>Use the same reference from your application, editor, or agent.</p>
      </header>

      <div className="integration-catalogue-downloads">
        <a href={`${PUBLIC_API_URL}/api/v1/catalogue?format=json`} download>Download JSON</a>
        <a href={`${PUBLIC_API_URL}/api/v1/catalogue?format=markdown`} download>Download Markdown</a>
        <span>Schema {metadata.schemaVersion} · {metadata.practiceCount} practices</span>
        <details><summary>Dataset version</summary><code>{metadata.datasetVersion}</code></details>
      </div>

      <div className="integrations-tablist" role="tablist" aria-label="Integration options">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={element => { tabButtons.current[index] = element; }}
            type="button"
            role="tab"
            id={`integration-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`integration-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={event => changeTab(event, index)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tabs.map(({ id }) => <div
        key={id}
        className="integrations-panel"
        role="tabpanel"
        id={`integration-panel-${id}`}
        aria-labelledby={`integration-tab-${id}`}
        hidden={id !== tab}
        tabIndex={0}
      >
        {id !== tab ? null : tab === "rest" ? (
          <div className="integrations-api-grid">
            <div className="integrations-docs-column">
              <section className="integration-surface integration-endpoints">
                <div className="integration-section-heading">
                  <span className="integration-icon"><Braces size={22} aria-hidden="true" /></span>
                  <div><h2>REST API</h2><p>Search and retrieve practices.</p></div>
                </div>
                <div className="integration-endpoint-list">
                  {endpoints.map(endpoint => (
                    <a key={endpoint.path} href={`${PUBLIC_API_URL}${endpoint.href}`} target="_blank" rel="noreferrer">
                      <span className="integration-method">{endpoint.method}</span>
                      <span><code>{endpoint.path}</code><span>{endpoint.description}</span></span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ))}
                </div>
                <a className="integration-link" href={`${PUBLIC_API_URL}/api/v1/openapi.json`} target="_blank" rel="noreferrer">
                  <FileJson size={17} aria-hidden="true" /> OpenAPI specification
                </a>
              </section>

              <section className="integration-surface integration-request-guide">
                <h2>Make a request</h2>
                <p>Search by keyword. Add a category or source to narrow the results.</p>
                <CodeBlock label="Example request" code={`curl '${PUBLIC_API_URL}/api/v1/practices?q=unknown&limit=2'`} />
                <dl className="integration-parameters">
                  <div><dt><code>q</code></dt><dd>Search text, up to 300 characters.</dd></div>
                  <div><dt><code>category</code></dt><dd>A stable topic ID, such as <code>types</code> or <code>declarations</code>.</dd></div>
                  <div><dt><code>source</code></dt><dd><code>community</code> or <code>handbook</code>.</dd></div>
                  <div><dt><code>context</code></dt><dd>Filter by where the guidance applies.</dd></div>
                  <div><dt><code>environment</code></dt><dd>Filter by runtime or environment.</dd></div>
                  <div><dt><code>tag</code></dt><dd>Filter by an exact tag ID.</dd></div>
                  <div><dt><code>limit / offset</code></dt><dd>Default limit 20. Maximum 100. Offset starts at 0.</dd></div>
                </dl>
                <h3>Retrieve several practices</h3>
                <p>Send up to 20 unique IDs. Found practices keep the requested order; unknown IDs appear in <code>missingIds</code>.</p>
                <CodeBlock label="Batch request" code={String.raw`curl '${PUBLIC_API_URL}/api/v1/practices/batch' \
  -H 'Content-Type: application/json' \
  -d '{"ids":["raw-javascript-is-faster","use-utility-types"]}'`} />
                <p className="integration-small-print">Responses include <code>meta.schemaVersion</code> and <code>meta.datasetVersion</code>. Search pagination lives in <code>meta</code>. Validation failures use <code>application/problem+json</code> with parameter details.</p>
                <div className="integration-access-note">
                  <LockKeyhole size={16} aria-hidden="true" />
                  <p>The public API URL above works without a Site sign-in. This reference site keeps its own access settings. The playground uses your signed-in browser on this site.</p>
                </div>
              </section>
            </div>

            <section className="integration-surface integration-playground" aria-labelledby="api-playground-title">
              <div className="integration-section-heading">
                <span className="integration-icon"><Terminal size={21} aria-hidden="true" /></span>
                <div><h2 id="api-playground-title">Try the API</h2><p>Send a real request to this site.</p></div>
              </div>
              <form onSubmit={event => { event.preventDefault(); void runRequest(); }}>
                <label htmlFor="api-search-query">Search query</label>
                <div className="integration-query-input">
                  <Search size={18} aria-hidden="true" />
                  <input id="api-search-query" value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. unknown" maxLength={300} />
                </div>
                <div className="integration-request-options">
                  <div className="integration-source-control">
                    <label htmlFor="api-search-source">Source</label>
                    <div>
                      <select id="api-search-source" value={source} onChange={event => setSource(event.target.value)}>
                        <option value="all">All sources</option>
                        <option value="community">Community guide</option>
                        <option value="handbook">TypeScript Handbook</option>
                      </select>
                      <ChevronDown size={15} aria-hidden="true" />
                    </div>
                  </div>
                  <button className="integration-primary-button" type="submit" disabled={result.state === "loading"}>
                    {result.state === "loading" ? <><LoaderCircle size={16} aria-hidden="true" /> Sending…</> : "Send request"}
                  </button>
                </div>
              </form>
              <div className="integration-request-path"><span>GET</span><code>{requestPath}</code></div>
              <div className="integration-response" aria-live="polite" aria-busy={result.state === "loading"}>
                <div className="integration-response-heading">
                  <span>Response</span>
                  {result.state === "success" ? (
                    <div><span className="integration-status"><Check size={12} aria-hidden="true" />{result.status} OK</span><span>{result.duration} ms</span><CopyButton text={result.body} label="Copy JSON" /></div>
                  ) : result.state === "error" && result.status ? <span className="integration-error-status">{result.status}</span> : null}
                </div>
                {result.state === "idle" ? (
                  <div className="integration-response-placeholder"><FileJson size={30} aria-hidden="true" /><h3>Your response will appear here</h3><p>Search the catalogue to see the JSON returned by the API.</p></div>
                ) : result.state === "loading" ? (
                  <div className="integration-response-placeholder"><LoaderCircle className="integration-loader" size={27} aria-hidden="true" /><h3>Reading the catalogue</h3><p>Waiting for the API response…</p></div>
                ) : result.state === "error" ? (
                  <div className="integration-response-placeholder integration-response-error"><CircleAlert size={28} aria-hidden="true" /><h3>Request failed</h3><p>{result.message}</p><button className="integration-link" onClick={() => void runRequest()}>Try again</button></div>
                ) : (
                  <>
                    {result.total === 0 ? <div className="integration-no-matches"><Search size={16} aria-hidden="true" /><span>No matching practices. Try another keyword or source.</span></div> : <p className="integration-response-count">Showing {result.count} of {result.total} matching {result.total === 1 ? "practice" : "practices"}.</p>}
                    <pre className="integration-response-json"><code>{result.body}</code></pre>
                  </>
                )}
              </div>
              <p className="integration-playground-note">Search returns compact results with pagination and match information. Read a practice by ID for its full content.</p>
            </section>
          </div>
        ) : tab === "mcp" ? (
          <div className="integrations-mcp-grid">
            <section className="integration-surface integration-tool-guide">
              <div className="integration-section-heading">
                <span className="integration-icon"><Plug size={22} aria-hidden="true" /></span>
                <div><h2>MCP tools</h2><p>Read-only access with typed input and output schemas.</p></div>
              </div>
              <div className="integration-tool-list">
                {tools.map(tool => <div key={tool.name}><code>{tool.name}</code><p>{tool.description}</p></div>)}
              </div>
              <div className="integration-access-note"><FileJson size={17} aria-hidden="true" /><p>Search returns compact summaries. Fetch a practice by ID for structured applicability, examples, notes, citations, and relationships. Every tool declares its input and output schemas.</p></div>
            </section>
            <div className="integrations-docs-column">
              <section className="integration-surface integration-connection-guide">
                <h2>Connect in ChatGPT or Codex</h2>
                <p>Install this site’s plugin from <strong>Plugins · Personal · Created by you</strong>. The plugin uses your access to the hosted site.</p>
                <div className="integration-endpoint-pill"><code>{origin}/mcp</code><CopyButton text={`${origin}/mcp`} label="Copy endpoint" /></div>
                <div className="integration-access-note"><LockKeyhole size={16} aria-hidden="true" /><p>A private Sites endpoint uses the Site plugin. It is separate from the standalone server and its connection settings.</p></div>
              </section>
              <section className="integration-surface integration-connection-guide">
                <h2>Connect another MCP client</h2>
                <p>Use the public endpoint with a client that supports Streamable HTTP. No Site plugin is required for this connection.</p>
                <CodeBlock label="Remote MCP configuration" code={remoteConfig} />
                <p className="integration-small-print">The public API service is separate from this reference site. The public endpoint uses <code>/api/mcp</code>; for a local server, use <code>http://127.0.0.1:3001/mcp</code>. The HTTP endpoint is stateless and returns JSON. Client configuration formats vary.</p>
                <button className="integration-link" onClick={() => { setTab("self-host"); tabButtons.current[2]?.focus(); }}>View local setup</button>
              </section>
            </div>
          </div>
        ) : (
          <div className="integrations-selfhost-grid">
            <section className="integration-surface integration-setup-guide">
              <div className="integration-section-heading">
                <span className="integration-icon"><Server size={22} aria-hidden="true" /></span>
                <div><h2>Run your own instance</h2><p>Node.js 22.13 or later.</p></div>
              </div>
              <p>Install the dependencies, then run the standalone API and MCP server from the checkout.</p>
              <CodeBlock label="Get the source" code="git clone https://github.com/VirajShah21/typescript-practices.git\ncd typescript-practices\nnpm ci" />
              <CodeBlock label="Start the API and HTTP MCP server" code="node --experimental-strip-types server/http.mjs" />
              <p className="integration-small-print">The server listens at <code>http://127.0.0.1:3001</code>. The API lives at <code>/api/v1</code> and MCP at <code>/mcp</code>. Set <code>PORT</code> to use a different port.</p>
              <h3>Run the complete website</h3>
              <CodeBlock label="Website development" code="npm run dev" />
              <a className="integration-link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">Read the full setup guide <ExternalLink size={14} aria-hidden="true" /></a>
            </section>
            <div className="integrations-docs-column">
              <section className="integration-surface integration-setup-guide">
                <h2>Use local stdio MCP</h2>
                <p>After running <code>npm ci</code>, let your MCP client launch the server directly. Replace the path below with your checkout’s absolute path.</p>
                <CodeBlock label="Local MCP configuration" code={stdioConfig} />
                <CodeBlock label="Run from the command line" code="node --experimental-strip-types server/stdio.mjs" />
                <p className="integration-small-print">The stdio server uses the same catalogue and tools. It reads JSON-RPC from stdin and writes replies to stdout.</p>
              </section>
              <section className="integration-surface integration-source-guide">
                <Github size={28} />
                <h2>Open source</h2>
                <p>The website, API, and MCP server are in one repository. Original application and server code is MIT licensed.</p>
                <a className="integration-primary-button" href={REPO_URL} target="_blank" rel="noreferrer">View source code</a>
                <p className="integration-small-print">Handbook-derived content remains CC BY 4.0. Community guide content retains its MIT notice. Review the source notices before redistributing.</p>
              </section>
            </div>
          </div>
        )}
      </div>)}
    </div>
  );
}
