"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Braces, ChevronDown, Code2, Download, ExternalLink, FileCode2, Info, Layers, ListFilter, Menu, Plug, Search, SlidersHorizontal, UserRound, X } from "lucide-react";
import type { Practice, Source } from "../../lib/models.ts";
import { categories, contexts, environments } from "../../lib/taxonomy.ts";
import { searchCatalogue } from "../../lib/search.ts";
import { PUBLIC_API_URL, REFERENCE_SITE_URL } from "../../lib/config.ts";
import { CodeBlock, CopyButton, Github } from "./primitives";
import Integrations from "./integrations";
import Sources from "./sources";
import "./reference.css";

type View = "reference" | "integrations" | "sources";
type Metadata = { schemaVersion: string; datasetVersion: string; practiceCount: number; sourceCount: number };
type Filters = {
  q: string;
  category: "" | Practice["category"];
  source: "" | Source["id"];
  context: "" | Practice["applicability"]["contexts"][number];
  environment: "" | Practice["applicability"]["environments"][number];
  tag: string;
};

const REPO_URL = "https://github.com/VirajShah21/typescript-practices";
const categoryIcons = [Braces, Code2, Layers, SlidersHorizontal, ListFilter, FileCode2];
const emptyFilters: Filters = { q: "", category: "", source: "", context: "", environment: "", tag: "" };
const noteLabels = { "editorial-correction": "Editorial correction", exception: "Exception", "historical-context": "Historical context" };
const variantLabels = { avoid: "Avoid", prefer: "Prefer", alternative: "Alternative", tradeoff: "Tradeoff" };
const relationLabels = { related: "Related", complements: "Complements", alternative: "Alternative", prerequisite: "Prerequisite" };

function sourceLabel(source: Source | undefined) {
  if (source?.id === "handbook") return "TypeScript Handbook";
  return source?.kind === "personal" ? `${source.title} · Opinionated` : source?.title || "Unknown source";
}

function labelFor(items: readonly { id: string; label: string }[], id: string) {
  return items.find(item => item.id === id)?.label || id;
}

function readFilters(params: URLSearchParams, sources: Source[]): Filters {
  const category = params.get("category") || "";
  const source = params.get("source") || "";
  const context = params.get("context") || "";
  const environment = params.get("environment") || "";
  return {
    q: (params.get("q") || "").slice(0, 300),
    category: categories.some(item => item.id === category) ? category as Filters["category"] : "",
    source: sources.some(item => item.id === source) ? source as Filters["source"] : "",
    context: contexts.some(item => item.id === context) ? context as Filters["context"] : "",
    environment: environments.some(item => item.id === environment) ? environment as Filters["environment"] : "",
    tag: params.get("tag") || "",
  };
}

function findMatches(practices: Practice[], filters: Filters) {
  return searchCatalogue(practices, {
    q: filters.q,
    category: filters.category || undefined,
    source: filters.source || undefined,
    context: filters.context || undefined,
    environment: filters.environment || undefined,
    tag: filters.tag || undefined,
    limit: 100,
  });
}

function updateUrl(view: View, id: string, filters: Filters, push = false) {
  const params = new URLSearchParams();
  if (view !== "reference") params.set("view", view);
  else {
    if (id) params.set("practice", id);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  }
  const url = params.size ? `?${params}` : "/";
  if (push && location.search !== url) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

export default function Reference({
  practices,
  sources,
  metadata,
  initialView = "reference",
  initialPractice = "",
  initialFilters = {},
}: {
  practices: Practice[];
  sources: Source[];
  metadata: Metadata;
  initialView?: View;
  initialPractice?: string;
  initialFilters?: Record<string, string>;
}) {
  const [view, setView] = useState<View>(initialView);
  const [origin, setOrigin] = useState(REFERENCE_SITE_URL);
  const [filters, setFilters] = useState<Filters>(() => readFilters(new URLSearchParams(initialFilters), sources));
  const [selectedId, setSelectedId] = useState(initialPractice && practices.some(item => item.id === initialPractice) ? initialPractice : "raw-javascript-is-faster");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileReader, setMobileReader] = useState(Boolean(initialPractice));
  const [expandedFilters, setExpandedFilters] = useState(Boolean(initialFilters.context || initialFilters.environment || initialFilters.tag));
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
      const requestedView = params.get("view");
      const nextView = requestedView === "integrations" || requestedView === "sources" ? requestedView : "reference";
      const nextFilters = readFilters(params, sources);
      const nextId = params.get("practice") || "raw-javascript-is-faster";
      const matches = findMatches(practices, nextFilters).matches;
      setView(nextView);
      setFilters(nextFilters);
      setSelectedId(matches.find(item => item.practice.id === nextId)?.practice.id || matches[0]?.practice.id || nextId);
      setExpandedFilters(Boolean(nextFilters.context || nextFilters.environment || nextFilters.tag));
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
  }, [practices, sources]);

  useEffect(() => {
    if (view === "reference" && requestSearchFocus.current) {
      searchRef.current?.focus();
      updateUrl("reference", selectedId, filters);
      requestSearchFocus.current = false;
    }
  }, [view]);

  const search = findMatches(practices, filters);
  const selected = search.matches.find(item => item.practice.id === selectedId)?.practice || search.matches[0]?.practice || practices[0];
  const tags = [...new Set(practices.flatMap(practice => practice.tags))].sort();
  const activeFilterCount = [filters.context, filters.environment, filters.tag].filter(Boolean).length;
  const categoryLabel = filters.category ? labelFor(categories, filters.category) : "All practices";

  useEffect(() => {
    if (!selected) return;
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
  }, [selected?.id, view, mobileReader]);

  function changeFilters(next: Filters) {
    const matches = findMatches(practices, next).matches;
    const id = matches.find(item => item.practice.id === selectedId)?.practice.id || matches[0]?.practice.id || selectedId;
    setFilters(next);
    setSelectedId(id);
    setMobileReader(false);
    setView("reference");
    updateUrl("reference", id, next);
  }

  function openPractice(id: string) {
    const nextFilters = search.matches.some(item => item.practice.id === id) ? filters : emptyFilters;
    if (nextFilters !== filters) setFilters(nextFilters);
    lastResultId.current = id;
    requestReaderFocus.current = true;
    setSelectedId(id);
    setMobileReader(true);
    setView("reference");
    updateUrl("reference", id, nextFilters, true);
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
    updateUrl(next, selectedId, filters, true);
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
            <button className={`category-button ${!filters.category ? "selected" : ""}`} onClick={() => { changeFilters({ ...filters, category: "" }); setMobileMenu(false); }}><BookOpen size={17} /><span>All practices</span><span className="count">{practices.length}</span></button>
            <div className="sidebar-heading topic-heading">Topics</div>
            {categories.map(({ id, label }, index) => {
              const Icon = categoryIcons[index];
              return <button key={id} className={`category-button ${filters.category === id ? "selected" : ""}`} onClick={() => { changeFilters({ ...filters, category: id }); setMobileMenu(false); }}><Icon size={17} /><span>{label}</span><span className="count">{practices.filter(practice => practice.category === id).length}</span></button>;
            })}
            <div className="sidebar-bottom">
              <div className="connection-note"><span className="connection-icon"><Plug size={19} /></span><strong>In your workflow</strong><p>Reference the same guidance from your editor or agent.</p><button onClick={() => navigate("integrations")}>Connect your tools</button></div>
              <button className="source-note" onClick={() => navigate("sources")}><span className="source-mini-icons"><Github size={14} /><FileCode2 size={14} /></span><span>{sources.length} sources. One reference.</span><span className="source-note-detail">View sources & licenses</span></button>
            </div>
          </aside>
        </> : null}
        <main id="main-content" className={`main-content ${view !== "reference" ? "document-main" : "reference-main"}`}>
          {view === "reference" ? <>
            <section className="page-intro">
              <div><div className="intro-title-row"><h1>TypeScript practices</h1><span className="reference-badge">{practices.length} practices</span></div><p>Project conventions, declaration-file guidelines, and personal preferences.</p></div>
              <div className="intro-source"><div className="source-symbols"><span>TS</span><Github size={18} /></div><span>Community, Handbook<br />& personal preferences</span></div>
            </section>
            <div className="search-toolbar">
              <div className="search-field"><Search size={19} /><input ref={searchRef} type="search" aria-label="Search practices" placeholder="Search practices, types, or patterns" value={filters.q} maxLength={300} onChange={event => changeFilters({ ...filters, q: event.target.value })} /><kbd>/</kbd></div>
              <div className="source-filter"><ListFilter size={16} /><select aria-label="Filter by source" value={filters.source} onChange={event => changeFilters({ ...filters, source: event.target.value as Filters["source"] })}><option value="">All sources</option>{sources.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select><ChevronDown size={14} /></div>
              <button className={`reference-filter-toggle ${expandedFilters ? "is-active" : ""}`} aria-expanded={expandedFilters} aria-controls="reference-extra-filters" onClick={() => setExpandedFilters(!expandedFilters)}><SlidersHorizontal size={16} />Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
            </div>
            {expandedFilters ? <div className="reference-extra-filters" id="reference-extra-filters">
              <label>Context<div><select aria-label="Context" value={filters.context} onChange={event => changeFilters({ ...filters, context: event.target.value as Filters["context"] })}><option value="">All contexts</option>{contexts.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select><ChevronDown size={14} /></div></label>
              <label>Environment<div><select aria-label="Environment" value={filters.environment} onChange={event => changeFilters({ ...filters, environment: event.target.value as Filters["environment"] })}><option value="">All environments</option>{environments.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select><ChevronDown size={14} /></div></label>
              <label>Tag<div><select aria-label="Tag" value={filters.tag} onChange={event => changeFilters({ ...filters, tag: event.target.value })}><option value="">All tags</option>{tags.map(tag => <option value={tag} key={tag}>{tag}</option>)}</select><ChevronDown size={14} /></div></label>
              {activeFilterCount ? <button onClick={() => changeFilters({ ...filters, context: "", environment: "", tag: "" })}>Reset filters</button> : null}
            </div> : null}
            <div className={`reference-grid ${mobileReader ? "show-reader" : ""}`}>
              <section className="results-pane" aria-label="Practices">
                <div className="results-heading"><span>{categoryLabel}</span><span aria-live="polite">{search.total} {search.total === 1 ? "result" : "results"}</span></div>
                <div className="practice-list" ref={listRef}>
                  {search.matches.length ? search.matches.map(({ practice, match }) => {
                    const originCitation = practice.citations.find(citation => citation.role === "origin");
                    const source = sources.find(item => item.id === originCitation?.sourceId);
                    return <button key={practice.id} data-practice={practice.id} className={`practice-item ${selected?.id === practice.id ? "current" : ""}`} onClick={() => openPractice(practice.id)} aria-pressed={selected?.id === practice.id}>
                      <span className="item-title">{practice.title}</span><span className="item-summary">{filters.q && match.snippet ? match.snippet : practice.summary}</span>
                      <span className={`source-tag ${source?.id}`}>{source?.id === "handbook" ? <FileCode2 size={12} /> : source?.kind === "personal" ? <UserRound size={12} /> : <Github size={12} />}{sourceLabel(source)}</span>
                    </button>;
                  }) : <div className="empty-results"><Search size={27} /><h2>No practices found</h2><p>Try another phrase or clear the filters.</p><button className="primary-button" onClick={() => changeFilters(emptyFilters)}>Clear filters</button></div>}
                </div>
              </section>
              {search.matches.length && selected ? <article className="reader-pane" ref={readerRef} key={selected.id} aria-label={selected.title}>
                <button className="back-button" onClick={backToResults}>Back to results</button>
                <div className="reader-meta"><span>{labelFor(categories, selected.category)}</span><span>{selected.citations.map(citation => sourceLabel(sources.find(source => source.id === citation.sourceId))).filter((name, index, names) => names.indexOf(name) === index).join(" + ")}</span></div>
                <h2 ref={headingRef} tabIndex={-1}>{selected.title}</h2><p className="reader-summary">{selected.summary}</p>
                <div className="reference-applicability"><span>Applies to</span><div>{selected.applicability.contexts.map(id => <span key={id}>{labelFor(contexts, id)}</span>)}{selected.applicability.environments.map(id => <span className="environment-chip" key={id}>{labelFor(environments, id)}</span>)}</div></div>
                {selected.explanation.split(/\n\n+/).map((paragraph, index) => <p className="explanation" key={`${selected.id}-explanation-${index}`}>{paragraph}</p>)}
                {selected.applicability.when.length || selected.applicability.exceptions.length ? <section className="reference-conditions"><h3>When to apply this</h3>{selected.applicability.when.length ? <ul>{selected.applicability.when.map(condition => <li key={condition}>{condition}</li>)}</ul> : null}{selected.applicability.exceptions.length ? <><h4>Exceptions</h4><ul>{selected.applicability.exceptions.map(exception => <li key={exception}>{exception}</li>)}</ul></> : null}</section> : null}
                {selected.notes.map((note, index) => <aside className={`context-note reference-note ${note.kind}`} key={`${note.kind}-${index}`}><Info size={17} /><div><strong>{noteLabels[note.kind]}</strong><p>{note.text}</p>{note.references.length ? <div className="reference-note-links">{note.references.map(reference => <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">{reference.title}<ExternalLink size={12} /></a>)}</div> : null}</div></aside>)}
                {selected.examples.length ? <section className="example-section"><h3>Examples</h3>{selected.examples.map(example => <div className="reference-example" key={example.id}><div className="reference-example-heading"><span>{example.language}</span><span>Illustrative example</span></div>{example.variants.map(variant => <CodeBlock key={variant.role} code={variant.code} label={variantLabels[variant.role]} kind={variant.role === "avoid" ? "bad" : variant.role === "prefer" ? "good" : undefined} />)}<p>{example.explanation}</p></div>)}</section> : null}
                <section className="reader-source reference-citations"><h3>Sources & citations</h3>{selected.citations.map(citation => {
                  const source = sources.find(item => item.id === citation.sourceId);
                  return <div key={`${citation.sourceId}-${citation.url}`}><a href={citation.url} target="_blank" rel="noreferrer">{citation.section}<ExternalLink size={13} /></a><p>{source?.title}. {citation.role === "origin" ? "Original guidance" : "Supporting reference"}.{source ? source.licenseUrl ? <> <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a></> : <> License not specified.</> : null}</p></div>;
                })}<button className="reference-attribution-link" onClick={() => navigate("sources")}>Attribution & license notices</button></section>
                {selected.relations.length ? <section className="related reference-relations"><h3>Related practices</h3><div>{selected.relations.map(relation => {
                  const practice = practices.find(item => item.id === relation.practiceId);
                  return practice ? <button key={relation.practiceId} onClick={() => openPractice(relation.practiceId)}><span>{relationLabels[relation.kind]}</span><strong>{practice.title}</strong><span>{relation.reason}</span></button> : null;
                })}</div></section> : null}
                {selected.tags.length ? <div className="reference-tags" aria-label="Practice tags">{selected.tags.map(tag => <button key={tag} onClick={() => { changeFilters({ ...emptyFilters, tag }); setExpandedFilters(true); }}>{tag}</button>)}</div> : null}
                <div className="reader-footer"><a href={`${PUBLIC_API_URL}/api/v1/practices/${selected.id}`} target="_blank" rel="noreferrer"><Braces size={15} />View JSON</a><a href={`${PUBLIC_API_URL}/api/v1/catalogue?format=markdown`}><Download size={14} />Download catalogue</a><CopyButton text={`${origin}/?practice=${selected.id}`} label="Copy link" /></div>
              </article> : <div className="reader-placeholder"><BookOpen size={32} /><p>Try another search or clear the filters.</p></div>}
            </div>
          </> : view === "integrations" ? <Integrations origin={origin} metadata={metadata} sources={sources} /> : <Sources sources={sources} practices={practices} metadata={metadata} />}
        </main>
      </div>
    </div>
  );
}
