"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Braces, Check, ChevronDown, Code2, Copy, ExternalLink, FileCode2, Layers, ListFilter, Menu, Plug, Search, SlidersHorizontal, X } from "lucide-react";

type Practice = { id:string; title:string; summary:string; explanation:string; category:string; source:string; sourceUrl:string; sourceTitle:string; scope:string; tags:string[]; caveat?:string; bad?:string; good?:string; related:string[] };
type Source = {id:string; title:string; author:string; url:string; license:string; licenseUrl:string; revision:string; checkedAt:string};
type View = "reference" | "integrations" | "sources";
const categories = ["Types", "Functions", "Code structure", "Runtime", "Tooling", "Declarations"];
const categoryIcons = [Braces, Code2, Layers, SlidersHorizontal, ListFilter, FileCode2];
const sourceName = (id:string) => id === "handbook" ? "TypeScript Handbook" : "Community guide";
const SITE_URL = "https://typescript-practices-reference.shahvirajd.chatgpt.site";
const REPO_URL = "https://github.com/VirajShah21/typescript-practices";

function Github({size=20}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.08c-3.12.68-3.78-1.32-3.78-1.32-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.49-.28-5.1-1.24-5.1-5.54 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.31-2.61 5.25-5.1 5.53.4.35.75 1.03.75 2.08v3.07c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>;
}
function CopyButton({text,label="Copy"}:{text:string;label?:string}) {
  const [state,setState] = useState("");
  useEffect(() => { if (!state) return; const timer=setTimeout(()=>setState(""),2000); return ()=>clearTimeout(timer); },[state]);
  return <button className="copy-button" onClick={async()=>{try { await navigator.clipboard.writeText(text); setState("Copied"); } catch {setState("Copy failed");}}} aria-label={state || label}>{state==="Copied"?<Check size={15}/>:<Copy size={15}/>}<span>{state||label}</span></button>;
}
function Highlight({code}:{code:string}) {
  const tokens = code.split(/(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*'|`[^`]*`|\b(?:const|let|type|interface|function|return|if|else|true|false|undefined|null|unknown|any|string|number|boolean|async|await|new|import|from|export|readonly|void|declare)\b)/g);
  return <>{tokens.map((token,i)=><span key={i} className={token.startsWith("//")?"token-comment":/^["'`]/.test(token)?"token-string":/^(const|let|type|interface|function|return|if|else|true|false|undefined|null|unknown|any|string|number|boolean|async|await|new|import|from|export|readonly|void|declare)$/.test(token)?"token-keyword":undefined}>{token}</span>)}</>;
}
function CodeBlock({code,label,kind}:{code:string;label:string;kind?:string}) {
  return <div className={`code-block ${kind||""}`}><div className="code-bar"><span>{kind==="good"?<Check size={15}/>:kind==="bad"?<X size={15}/>:<Code2 size={15}/>} {label}</span><CopyButton text={code}/></div><pre><code><Highlight code={code}/></code></pre></div>;
}

export default function Reference({practices,sources}:{practices:Practice[];sources:Source[]}) {
  const [view,setView]=useState<View>("reference");
  const [origin,setOrigin]=useState(SITE_URL);
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All practices");
  const [source,setSource]=useState("all");
  const [selectedId,setSelectedId]=useState("raw-javascript-is-faster");
  const [mobileMenu,setMobileMenu]=useState(false);
  const [mobileReader,setMobileReader]=useState(false);
  const [apiQuery,setApiQuery]=useState("unknown");
  const [apiResult,setApiResult]=useState("");
  const [apiBusy,setApiBusy]=useState(false);
  const searchRef=useRef<HTMLInputElement>(null);
  const readerRef=useRef<HTMLElement>(null);
  const listRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    setOrigin(location.origin);
    const params=new URLSearchParams(location.search);
    const id=params.get("practice");
    if(id && practices.some(p=>p.id===id)){setSelectedId(id);setMobileReader(true);}
    const tab=params.get("view");if(tab==="integrations"||tab==="sources")setView(tab);
    const q=params.get("q");if(q)setQuery(q);
    const handler=(e:KeyboardEvent)=>{if(e.key==="/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)){e.preventDefault();setView("reference");searchRef.current?.focus();}};
    document.addEventListener("keydown",handler);return()=>document.removeEventListener("keydown",handler);
  },[practices]);
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered=practices.filter(p=>(category==="All practices"||p.category===category)&&(source==="all"||p.source===source)&&terms.every(t=>`${p.id} ${p.sourceTitle} ${p.title} ${p.summary} ${p.explanation} ${p.tags.join(" ")} ${p.caveat||""}`.toLowerCase().includes(t)));
  const selected=filtered.find(p=>p.id===selectedId)||filtered[0]||practices.find(p=>p.id===selectedId)||practices[0];
  useEffect(()=>{
    const list=listRef.current;
    const item=list?.querySelector<HTMLButtonElement>(`[data-practice="${selected.id}"]`);
    if(list&&item)list.scrollTop=item.offsetTop-list.offsetTop;
  },[selected.id,view]);
  function openPractice(id:string){setSelectedId(id);setMobileReader(true);setView("reference");history.replaceState(null,"",`?practice=${encodeURIComponent(id)}`);readerRef.current?.scrollTo({top:0});}
  function navigate(next:View){setView(next);setMobileMenu(false);history.replaceState(null,"",next==="reference"?`?practice=${selectedId}`:`?view=${next}`);}
  function chooseCategory(next:string){const first=practices.find(p=>(next==="All practices"||p.category===next)&&(source==="all"||p.source===source));if(first)setSelectedId(first.id);setCategory(next);setMobileMenu(false);setMobileReader(false);setView("reference");}
  async function tryApi(){setApiBusy(true);setApiResult("");try{const r=await fetch(`/api/v1/practices?q=${encodeURIComponent(apiQuery)}&limit=2`);const json=await r.json();setApiResult(JSON.stringify(json,null,2));}catch{setApiResult("Request failed. Check your connection and try again.");}finally{setApiBusy(false);}}
  const remoteConfig=JSON.stringify({mcpServers:{"typescript-practices":{url:"http://127.0.0.1:3001/mcp"}}},null,2);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <a href="/" className="brand" aria-label="TypeScript Practices home"><span className="ts-logo">TS</span><span>TypeScript <strong>Practices</strong></span></a>
      <nav className="top-nav" aria-label="Main navigation">
        <button className={view==="reference"?"active":""} onClick={()=>navigate("reference")}><BookOpen size={17}/>Reference</button>
        <button className={view==="integrations"?"active":""} onClick={()=>navigate("integrations")}><Plug size={17}/>API & MCP</button>
        <button className={view==="sources"?"active":""} onClick={()=>navigate("sources")}><FileCode2 size={17}/>Sources</button>
      </nav>
      <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer"><Github size={18}/><span>Source code</span></a>
      <button className="mobile-menu-button" aria-label="Toggle topics" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button>
    </header>
    <div className="workspace">
      <aside className={`sidebar ${mobileMenu?"is-open":""}`} aria-label="Topics">
        <div className="sidebar-heading">Reference</div>
        <button className={`category-button ${category==="All practices"&&view==="reference"?"selected":""}`} onClick={()=>chooseCategory("All practices")}><BookOpen size={17}/><span>All practices</span><span className="count">{practices.length}</span></button>
        <div className="sidebar-heading topic-heading">Topics</div>
        {categories.map((c,i)=>{const Icon=categoryIcons[i];return <button key={c} className={`category-button ${category===c&&view==="reference"?"selected":""}`} onClick={()=>chooseCategory(c)}><Icon size={17}/><span>{c}</span><span className="count">{practices.filter(p=>p.category===c).length}</span></button>;})}
        <div className="sidebar-bottom"><div className="connection-note"><Plug size={20}/><strong>Use it in your tools</strong><p>The same reference, available through an API and MCP.</p><button onClick={()=>navigate("integrations")}>Connect your tools</button></div><button className="source-note" onClick={()=>navigate("sources")}>Two sources. One reference.<br/><span>Read about the content</span></button></div>
      </aside>
      <main id="main-content" className={`main-content ${view!=="reference"?"document-main":""}`}>
      {view==="reference" ? <>
        <section className="page-intro"><div><div className="intro-title-row"><h1>TypeScript practices</h1><span className="reference-badge">A practical reference</span></div><p>Project conventions and declaration-file guidelines.<br className="intro-break"/> Find the advice, understand the context, see the code.</p></div><div className="intro-source"><span className="source-symbols"><span>TS</span><Github size={20}/></span><span>Community guide +<br/>TypeScript Handbook</span></div></section>
        <div className="search-toolbar"><div className="search-field"><Search size={19}/><input ref={searchRef} type="search" aria-label="Search practices" placeholder="Search practices, types, or patterns…" value={query} onChange={e=>{setQuery(e.target.value);setMobileReader(false);}}/><kbd>/</kbd></div><div className="source-filter"><ListFilter size={17}/><select aria-label="Filter by source" value={source} onChange={e=>{const next=e.target.value;setSource(next);setCategory("All practices");const first=practices.find(p=>next==="all"||p.source===next);if(first)setSelectedId(first.id);setMobileReader(false);}}><option value="all">All sources</option><option value="community">Community guide</option><option value="handbook">TypeScript Handbook</option></select><ChevronDown size={15}/></div></div>
        <div className={`reference-grid ${mobileReader?"show-reader":""}`}>
          <section className="results-pane" aria-label="Practices"><div className="results-heading"><span>{category}</span><span aria-live="polite">{filtered.length} results</span></div><div className="practice-list" ref={listRef}>{filtered.length?filtered.map(p=><button key={p.id} data-practice={p.id} className={`practice-item ${selected.id===p.id?"current":""}`} onClick={()=>openPractice(p.id)} aria-pressed={selected.id===p.id}><span className="item-title">{p.title}</span><span className="item-summary">{p.summary}</span><span className={`source-tag ${p.source}`}>{p.source==="handbook"?<FileCode2 size={12}/>:<Github size={12}/>} {sourceName(p.source)}</span></button>):<div className="empty-results"><Search size={25}/><h2>No practices found</h2><p>Try a different phrase or clear the filters.</p><button className="primary-button" onClick={()=>{setQuery("");setCategory("All practices");setSource("all");}}>Clear filters</button></div>}</div></section>
          <article className="reader-pane" ref={readerRef} key={selected.id} aria-label={selected.title}>
            <button className="back-button" onClick={()=>setMobileReader(false)}>Back to results</button>
            <div className="reader-meta"><span>{selected.category}</span><span className={`source-tag ${selected.source}`}>{sourceName(selected.source)}</span></div>
            <h2>{selected.title}</h2><p className="reader-summary">{selected.summary}</p>
            <div className="scope-line"><FileCode2 size={16}/><span>{selected.scope}</span></div>
            <p className="explanation">{selected.explanation}</p>
            {selected.caveat?<aside className="context-note"><strong>Keep in mind</strong><p>{selected.caveat}</p></aside>:null}
            {selected.bad||selected.good?<section className="example-section"><h3>In practice</h3>{selected.bad?<CodeBlock code={selected.bad} label="Avoid" kind="bad"/>:null}{selected.good?<CodeBlock code={selected.good} label="Prefer" kind="good"/>:null}</section>:null}
            <div className="reader-source"><h3>Source</h3><a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceTitle}<ExternalLink size={14}/></a><p>{sourceName(selected.source)} · Rewritten with context. <button onClick={()=>navigate("sources")}>Attribution & licenses</button></p></div>
            {selected.related.length?<section className="related"><h3>Related practices</h3><div>{selected.related.map(id=>{const p=practices.find(x=>x.id===id);return p?<button key={id} onClick={()=>openPractice(id)}>{p.title}</button>:null;})}</div></section>:null}
            <div className="reader-footer"><span>Use this practice in your workflow</span><a href={`/api/v1/practices/${selected.id}`} target="_blank" rel="noreferrer">View JSON <Braces size={14}/></a><CopyButton text={`${origin}/?practice=${selected.id}`} label="Copy link"/></div>
          </article>
        </div>
      </> : view==="integrations" ? <div className="document-content"><div className="document-title"><Plug size={25}/><h1>API & MCP</h1></div><p className="document-lead">Use the same practices from your editor, an agent, or your own application. The site and both interfaces share one dataset.</p>
        <div className="integration-tabs"><a href="#rest-api">REST API</a><a href="#mcp-server">MCP server</a><a href="#self-host">Self-host</a></div>
        <section id="rest-api" className="doc-section"><h2>REST API</h2><p>Read-only JSON endpoints. Search by keyword, filter by topic or source, and retrieve a practice by its stable ID.</p><div className="endpoint-list">{[["/api/v1/practices","Search and filter practices"],["/api/v1/practices/{id}","Read one practice"],["/api/v1/categories","List topics"],["/api/v1/sources","Read source attribution"],["/api/v1/openapi.json","OpenAPI specification"]].map(([path,desc])=><div key={path}><span className="http-method">GET</span><code>{path}</code><span>{desc}</span></div>)}</div><CodeBlock label="Example request" code={`curl '${origin}/api/v1/practices?q=unknown&limit=2'`}/><p className="fine-print">The hosted site uses its access settings. A private site requires a signed-in browser or the Site plugin; curl works against a public or self-hosted instance.</p>
        <div className="api-playground"><h3>Try a search</h3><form onSubmit={e=>{e.preventDefault();void tryApi();}}><input value={apiQuery} onChange={e=>setApiQuery(e.target.value)} aria-label="API search query" placeholder="e.g. unknown" maxLength={200}/><button className="primary-button" disabled={apiBusy}>{apiBusy?"Loading…":"Send request"}</button></form>{apiResult?<pre className="api-result" aria-live="polite">{apiResult}</pre>:<p>Run a request to see the actual JSON response.</p>}</div><a className="text-link" href="/api/v1/openapi.json" target="_blank" rel="noreferrer">Open the API specification <ExternalLink size={14}/></a></section>
        <section id="mcp-server" className="doc-section"><h2>MCP server</h2><p>Search the reference and retrieve guidance with source links. All four tools are read-only.</p><div className="tool-table">{[["search_practices","Find guidance using a query and optional filters."],["get_practice","Get a full practice by ID, including examples."],["list_categories","List the available topics."],["list_sources","Read licenses, attribution, and source revisions."]].map(([name,desc])=><div key={name}><code>{name}</code><span>{desc}</span></div>)}</div><h3>Connect to the hosted site</h3><p>In ChatGPT or Codex, install this site’s plugin from <strong>Plugins · Personal · Created by you</strong>. The plugin uses your site access. The endpoint is <code>/mcp</code>.</p><h3>Other MCP clients</h3><p>Use a public or self-hosted instance with a client that supports Streamable HTTP. Replace the URL below with your instance’s origin.</p><CodeBlock label="Remote MCP configuration" code={remoteConfig}/><p className="fine-print">The server supports stateless JSON-RPC over HTTP and a local stdio transport. The hosted Sites connection uses its plugin. The configuration above connects to the standalone server running on your computer.</p></section>
        <section id="self-host" className="doc-section"><h2>Run your own instance</h2><p>The application and server code are MIT licensed. Download or clone the source for a standalone Node server, local stdio MCP, and the complete website.</p><a className="primary-button inline-button" href={REPO_URL} target="_blank" rel="noreferrer"><Github size={17}/>View source & setup</a><p className="fine-print">Derived Handbook content remains CC BY 4.0. Community guide content retains its MIT notice. See the source notices before redistributing.</p></section>
      </div> : <div className="document-content"><div className="document-title"><BookOpen size={25}/><h1>Sources & licenses</h1></div><p className="document-lead">One reference built from two sources. Each practice links to its original section and keeps its context visible.</p><div className="source-cards">{sources.map(s=><section key={s.id} className="source-card"><div className="source-card-icon">{s.id==="handbook"?<span>TS</span>:<Github size={25}/>}</div><div><span className="source-tag">{s.id==="handbook"?"Official documentation":"Community guidance"}</span><h2>{s.title}</h2><p>By {s.author}</p><a className="text-link" href={s.url} target="_blank" rel="noreferrer">Read the original <ExternalLink size={14}/></a><dl><div><dt>License</dt><dd><a href={s.licenseUrl} target="_blank" rel="noreferrer">{s.license}</a></dd></div><div><dt>Source revision</dt><dd><code>{s.revision.slice(0,12)}</code></dd></div><div><dt>Checked</dt><dd>{s.checkedAt}</dd></div><div><dt>Practices</dt><dd>{practices.filter(p=>p.source===s.id).length}</dd></div></dl></div></section>)}</div><section className="doc-section"><h2>How this reference is edited</h2><p>Summaries and examples have been rewritten and grouped by topic. Context notes qualify advice that depends on the project, runtime, or TypeScript version. These are editorial additions, not quotations or an endorsement by the original authors.</p><p>The Handbook guidance applies to declaration files and public API design. The community guide describes project conventions. Neither should replace checking your project’s requirements.</p><h3>Content snapshots</h3><p>The content is pinned to the revisions above. It does not update automatically when an upstream source changes.</p><h3>Redistribution</h3><p>Application and server code: MIT. Content derived from André de Sousa’s guide: MIT, copyright © 2021 André de Sousa. Content adapted from the TypeScript documentation: CC BY 4.0, credited to Microsoft and the TypeScript contributors. Changes include rewritten explanations, new examples, grouping, and context notes.</p><a className="text-link" href={REPO_URL} target="_blank" rel="noreferrer">Read the full license notices in the source <ExternalLink size={14}/></a></section></div>}
      </main>
    </div>
  </div>;
}
