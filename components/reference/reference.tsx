"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Braces, ChevronDown, Code2, ExternalLink, FileCode2, Info, Layers, ListFilter, Menu, Plug, Search, SlidersHorizontal, X } from "lucide-react";
import { CodeBlock, CopyButton, Github } from "./primitives";
import Integrations from "./integrations";
import Sources from "./sources";

type Practice = {
  id: string; title: string; summary: string; explanation: string; category: string;
  source: string; sourceUrl: string; sourceTitle: string; scope: string; tags: string[];
  caveat?: string; bad?: string; good?: string; related: string[];
};
type Source = { id: string; title: string; author: string; url: string; license: string; licenseUrl: string; revision: string; checkedAt: string };
type View = "reference" | "integrations" | "sources";
const categories = ["Types", "Functions", "Code structure", "Runtime", "Tooling", "Declarations"];
const categoryIcons = [Braces, Code2, Layers, SlidersHorizontal, ListFilter, FileCode2];
const SITE_URL = "https://typescript-practices-reference.shahvirajd.chatgpt.site";
const REPO_URL = "https://github.com/VirajShah21/typescript-practices";
const sourceName = (id: string) => id === "handbook" ? "TypeScript Handbook" : "Community guide";

function filterPractices(practices: Practice[], query: string, category: string, source: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return practices.filter(practice =>
    (category === "All practices" || practice.category === category) &&
    (source === "all" || practice.source === source) &&
    terms.every(term => `${practice.id} ${practice.sourceTitle} ${practice.title} ${practice.summary} ${practice.explanation} ${practice.tags.join(" ")} ${practice.caveat || ""}`.toLowerCase().includes(term))
  );
}

function updateUrl(view: View, id: string, query = "", category = "All practices", source = "all", push = false) {
  const params = new URLSearchParams();
  if (view !== "reference") params.set("view", view);
  else {
    if (id) params.set("practice", id);
    if (query) params.set("q", query);
    if (category !== "All practices") params.set("topic", category);
    if (source !== "all") params.set("source", source);
  }
  const url = params.size ? `?${params}` : "/";
  if (push && `${location.search}${location.hash}` !== url) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

export default function Reference({ practices, sources, initialView = "reference", initialPractice = "" }: { practices: Practice[]; sources: Source[]; initialView?: View; initialPractice?: string }) {
  const [view, setView] = useState<View>(initialView);
  const [origin, setOrigin] = useState(SITE_URL);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All practices");
  const [source, setSource] = useState("all");
  const [selectedId, setSelectedId] = useState(initialPractice && practices.some(item => item.id === initialPractice) ? initialPractice : "raw-javascript-is-faster");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileReader, setMobileReader] = useState(Boolean(initialPractice));
  const searchRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestSearchFocus = useRef(false);
  const requestReaderFocus = useRef(false);
  const lastResultId = useRef("");

  useEffect(() => {
    setOrigin(location.origin);
    function restoreUrl() {
      const params = new URLSearchParams(location.search);
      const tab = params.get("view");
      const nextView = tab === "integrations" || tab === "sources" ? tab : "reference";
      const nextQuery = params.get("q") || "";
      const topic = params.get("topic");
      const nextCategory = topic && categories.includes(topic) ? topic : "All practices";
      const sourceId = params.get("source");
      const nextSource = sourceId === "community" || sourceId === "handbook" ? sourceId : "all";
      const nextId = params.get("practice") || "raw-javascript-is-faster";
      const matches = filterPractices(practices, nextQuery, nextCategory, nextSource);
      setView(nextView);
      setQuery(nextQuery);
      setCategory(nextCategory);
      setSource(nextSource);
      setSelectedId(matches.find(item => item.id === nextId)?.id || matches[0]?.id || nextId);
      setMobileReader(params.has("practice"));
      setMobileMenu(false);
    }
    restoreUrl();
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenu(false);
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || editing) return;
      event.preventDefault();
      requestSearchFocus.current = true;
      setView("reference");
      setMobileReader(false);
      searchRef.current?.focus();
    }
    window.addEventListener("popstate", restoreUrl);
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("popstate", restoreUrl);
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [practices]);

  useEffect(() => {
    if (view === "reference" && requestSearchFocus.current) {
      searchRef.current?.focus();
      updateUrl("reference", selectedId, query, category, source);
      requestSearchFocus.current = false;
    }
  }, [view]);

  const filtered = filterPractices(practices, query, category, source);
  const selected = practices.find(practice => practice.id === selectedId) || practices[0];

  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLButtonElement>(`[data-practice="${selected.id}"]`);
    if (list && item && !matchMedia("(max-width: 760px)").matches) {
      const top = item.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top;
    }
    if (requestReaderFocus.current && view === "reference") {
      headingRef.current?.focus({ preventScroll: true });
      readerRef.current?.scrollTo({ top: 0 });
      if (matchMedia("(max-width: 760px)").matches) readerRef.current?.scrollIntoView({ block: "start" });
      requestReaderFocus.current = false;
    }
  }, [selected.id, view, mobileReader]);

  function changeFilters(nextQuery: string, nextCategory: string, nextSource: string) {
    const matches = filterPractices(practices, nextQuery, nextCategory, nextSource);
    const id = matches.find(item => item.id === selectedId)?.id || matches[0]?.id || selectedId;
    setQuery(nextQuery);
    setCategory(nextCategory);
    setSource(nextSource);
    setSelectedId(id);
    setMobileReader(false);
    setView("reference");
    updateUrl("reference", id, nextQuery, nextCategory, nextSource);
  }

  function openPractice(id: string) {
    const keepFilters = filtered.some(item => item.id === id);
    if (!keepFilters) { setQuery(""); setCategory("All practices"); setSource("all"); }
    lastResultId.current = id;
    requestReaderFocus.current = true;
    setSelectedId(id);
    setMobileReader(true);
    setView("reference");
    updateUrl("reference", id, keepFilters ? query : "", keepFilters ? category : "All practices", keepFilters ? source : "all", true);
  }

  function backToResults() {
    setMobileReader(false);
    requestAnimationFrame(() => {
      const item = listRef.current?.querySelector<HTMLButtonElement>(`[data-practice="${lastResultId.current || selectedId}"]`);
      item?.focus({ preventScroll: true });
      item?.scrollIntoView({ block: "nearest" });
    });
  }

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    updateUrl(next, selectedId, query, category, source, true);
    if (next !== "reference") window.scrollTo({ top: 0 });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand" aria-label="TypeScript Practices home"><span className="ts-logo">TS</span><span>TypeScript <strong>Practices</strong></span></a>
          <nav className="top-nav" aria-label="Main navigation">
            <button aria-current={view === "reference" ? "page" : undefined} className={view === "reference" ? "active" : ""} onClick={() => navigate("reference")}><BookOpen size={16} />Reference</button>
            <button aria-current={view === "integrations" ? "page" : undefined} className={view === "integrations" ? "active" : ""} onClick={() => navigate("integrations")}><Plug size={16} />API & MCP</button>
            <button aria-current={view === "sources" ? "page" : undefined} className={view === "sources" ? "active" : ""} onClick={() => navigate("sources")}><FileCode2 size={16} />Sources</button>
          </nav>
          <a className="github-link" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="View source code on GitHub"><Github size={17} /><span>Source code</span></a>
          {view === "reference" ? <button className="mobile-menu-button" aria-label="Toggle topics" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button> : null}
        </div>
      </header>
      <div className={`workspace ${view === "reference" ? "reference-workspace" : "document-workspace"}`}>
        {view === "reference" ? <>
          {mobileMenu ? <button className="menu-backdrop" aria-label="Close topics" onClick={() => setMobileMenu(false)} /> : null}
          <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`} aria-label="Topics">
            <div className="sidebar-heading">Library</div>
            <button className={`category-button ${category === "All practices" ? "selected" : ""}`} onClick={() => { changeFilters(query, "All practices", source); setMobileMenu(false); }}><BookOpen size={17} /><span>All practices</span><span className="count">{practices.length}</span></button>
            <div className="sidebar-heading topic-heading">Topics</div>
            {categories.map((name, index) => {
              const Icon = categoryIcons[index];
              return <button key={name} className={`category-button ${category === name ? "selected" : ""}`} onClick={() => { changeFilters(query, name, source); setMobileMenu(false); }}><Icon size={17} /><span>{name}</span><span className="count">{practices.filter(practice => practice.category === name).length}</span></button>;
            })}
            <div className="sidebar-bottom">
              <div className="connection-note"><span className="connection-icon"><Plug size={19} /></span><strong>In your workflow</strong><p>Reference the same guidance from your editor or agent.</p><button onClick={() => navigate("integrations")}>Connect your tools</button></div>
              <button className="source-note" onClick={() => navigate("sources")}><span className="source-mini-icons"><Github size={14} /><FileCode2 size={14} /></span><span>Two sources. One reference.</span><span className="source-note-detail">View sources & licenses</span></button>
            </div>
          </aside>
        </> : null}
        <main id="main-content" className={`main-content ${view !== "reference" ? "document-main" : "reference-main"}`}>
          {view === "reference" ? <>
            <section className="page-intro">
              <div><div className="intro-title-row"><h1>TypeScript practices</h1><span className="reference-badge">{practices.length} practices</span></div><p>Project conventions and declaration-file guidelines, together.</p></div>
              <div className="intro-source"><div className="source-symbols"><span>TS</span><Github size={18} /></div><span>Community guide<br />& TypeScript Handbook</span></div>
            </section>
            <div className="search-toolbar">
              <div className="search-field"><Search size={19} /><input ref={searchRef} type="search" aria-label="Search practices" placeholder="Search practices, types, or patterns" value={query} onChange={event => changeFilters(event.target.value, category, source)} /><kbd>/</kbd></div>
              <div className="source-filter"><ListFilter size={16} /><select aria-label="Filter by source" value={source} onChange={event => changeFilters(query, "All practices", event.target.value)}><option value="all">All sources</option><option value="community">Community guide</option><option value="handbook">TypeScript Handbook</option></select><ChevronDown size={14} /></div>
            </div>
            <div className={`reference-grid ${mobileReader ? "show-reader" : ""}`}>
              <section className="results-pane" aria-label="Practices">
                <div className="results-heading"><span>{category}</span><span aria-live="polite">{filtered.length} results</span></div>
                <div className="practice-list" ref={listRef}>
                  {filtered.length ? filtered.map(practice => (
                    <button key={practice.id} data-practice={practice.id} className={`practice-item ${selected.id === practice.id ? "current" : ""}`} onClick={() => openPractice(practice.id)} aria-pressed={selected.id === practice.id}>
                      <span className="item-title">{practice.title}</span><span className="item-summary">{practice.summary}</span>
                      <span className={`source-tag ${practice.source}`}>{practice.source === "handbook" ? <FileCode2 size={12} /> : <Github size={12} />}{sourceName(practice.source)}</span>
                    </button>
                  )) : <div className="empty-results"><Search size={27} /><h2>No practices found</h2><p>Try another phrase or clear the filters.</p><button className="primary-button" onClick={() => changeFilters("", "All practices", "all")}>Clear filters</button></div>}
                </div>
              </section>
              {filtered.length ? <article className="reader-pane" ref={readerRef} key={selected.id} aria-label={selected.title}>
                <button className="back-button" onClick={backToResults}>Back to results</button>
                <div className="reader-meta"><span>{selected.category}</span><span className={`source-tag ${selected.source}`}>{sourceName(selected.source)}</span></div>
                <h2 ref={headingRef} tabIndex={-1}>{selected.title}</h2><p className="reader-summary">{selected.summary}</p>
                <div className="scope-line"><FileCode2 size={15} /><span>{selected.scope}</span></div>
                <p className="explanation">{selected.explanation}</p>
                {selected.caveat ? <aside className="context-note"><Info size={17} /><div><strong>Keep in mind</strong><p>{selected.caveat}</p></div></aside> : null}
                {selected.bad || selected.good ? <section className="example-section"><h3>In practice</h3>{selected.bad ? <CodeBlock code={selected.bad} label="Avoid" kind="bad" /> : null}{selected.good ? <CodeBlock code={selected.good} label="Prefer" kind="good" /> : null}</section> : null}
                <section className="reader-source"><h3>Original source</h3><a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceTitle}<ExternalLink size={13} /></a><p>{sourceName(selected.source)}. Rewritten with context. <button onClick={() => navigate("sources")}>Attribution & licenses</button></p></section>
                {selected.related.length ? <section className="related"><h3>Related practices</h3><div>{selected.related.map(id => {
                  const practice = practices.find(item => item.id === id);
                  return practice ? <button key={id} onClick={() => openPractice(id)}>{practice.title}</button> : null;
                })}</div></section> : null}
                <div className="reader-footer"><a href={`/api/v1/practices/${selected.id}`} target="_blank" rel="noreferrer"><Braces size={15} />View JSON</a><CopyButton text={`${origin}/?practice=${selected.id}`} label="Copy link" /></div>
              </article> : <div className="reader-placeholder"><BookOpen size={32} /><p>Try another search or clear the filters.</p></div>}
            </div>
          </> : view === "integrations" ? <Integrations origin={origin} /> : <Sources sources={sources} practices={practices} />}
        </main>
      </div>
    </div>
  );
}
