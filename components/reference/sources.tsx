import { UserRound } from "lucide-react";
import { Github } from "./primitives";
import "./sources.css";

import type { Practice, Source } from "../../lib/models.ts";
import { PUBLIC_API_URL } from "../../lib/config.ts";

type Metadata = { schemaVersion: string; datasetVersion: string; practiceCount: number; sourceCount: number };

const REPOSITORY = "https://github.com/VirajShah21/typescript-practices";

function checkedDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function revisionUrl(source: Source) {
  if (source.id === "viraj") return `${REPOSITORY}/commit/${source.revision}`;
  return source.id === "handbook"
    ? `https://github.com/microsoft/TypeScript-Website/commit/${source.revision}`
    : `https://github.com/andredesousa/typescript-best-practices/commit/${source.revision}`;
}

export default function Sources({
  sources,
  practices,
  metadata,
}: {
  sources: Source[];
  practices: Practice[];
  metadata: Metadata;
}) {
  return (
    <div className="sources-page">
      <header className="sources-intro">
        <h1>Sources &amp; licenses</h1>
        <p>
          Official guidance, community conventions, and personal preferences, with their original sources.
          Every practice links to its original guidance.
        </p>
      </header>

      <section className="sources-dataset" aria-label="Catalogue downloads">
        <div><strong>Catalogue schema {metadata.schemaVersion}</strong><span>{metadata.practiceCount} practices · {metadata.sourceCount} sources</span></div>
        <div className="sources-dataset-links">
          <a href={`${PUBLIC_API_URL}/api/v1/catalogue?format=json`} download>Download JSON</a>
          <a href={`${PUBLIC_API_URL}/api/v1/catalogue?format=markdown`} download>Download Markdown</a>
          <a href={`${PUBLIC_API_URL}/api/v1/schema.json`} target="_blank" rel="noreferrer">JSON Schema</a>
        </div>
        <details><summary>Dataset version</summary><code>{metadata.datasetVersion}</code></details>
      </section>

      <div className="sources-grid">
        {sources.map((source) => {
          const isHandbook = source.id === "handbook";
          const isPersonal = source.kind === "personal";
          const count = practices.filter(
            (practice) => practice.citations.some(citation => citation.sourceId === source.id && citation.role === "origin"),
          ).length;

          return (
            <section className="sources-card" id={`source-${source.id}`} key={source.id}>
              <div className="sources-identity">
                <div
                  className={`sources-icon ${isHandbook ? "sources-icon-typescript" : isPersonal ? "sources-icon-personal" : "sources-icon-github"}`}
                  aria-hidden="true"
                >
                  {isHandbook ? <span>TS</span> : isPersonal ? <UserRound size={30} /> : <Github size={34} />}
                </div>
                <span>
                  {isPersonal ? "Personal preferences · Opinionated" : isHandbook ? "Official documentation" : "Community guide"}
                </span>
              </div>

              <h2>{source.title}</h2>
              <p className="sources-author">By {source.author}</p>
              <p className="sources-description">
                {isPersonal
                  ? `${count} opinionated ${count === 1 ? "practice" : "practices"} based on Viraj’s approved configurations.`
                  : isHandbook
                  ? `${count} guidelines for declaration files, callback contracts, and function overloads.`
                  : `${count} practices for project conventions, maintainable code, and runtime behavior.`}
              </p>
              {source.provenance ? <p className="sources-description">{source.provenance}</p> : null}
              <a
                className="sources-original"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {isPersonal ? "View approved configurations" : "Read the original"}
              </a>

              <dl className="sources-metadata">
                <div>
                  <dt>License</dt>
                  <dd>
                    {source.licenseUrl ? <a
                      href={source.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.license === "CC-BY-4.0"
                        ? "Creative Commons Attribution 4.0"
                        : source.license}
                    </a> : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt>Source revision</dt>
                  <dd>
                    <a
                      className="sources-revision"
                      href={revisionUrl(source)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View source revision ${source.revision}`}
                    >
                      <code>{source.revision}</code>
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Checked</dt>
                  <dd>
                    <time dateTime={source.checkedAt}>
                      {checkedDate(source.checkedAt)}
                    </time>
                  </dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>

      <div className="sources-editorial">
        <section className="sources-editing">
          <h2>How this reference is edited</h2>
          <p>
            Summaries and examples have been rewritten and grouped by topic.
            Context notes qualify advice that depends on the project, runtime,
            or TypeScript version. These are editorial additions, not quotations
            or an endorsement by the original authors. Notes distinguish editorial corrections,
            exceptions, and historical context. Examples identify their language and are marked
            as illustrative.
          </p>
          <p>
            The Handbook guidance applies to declaration files and public API
            design. The community guide describes project conventions. Viraj Shah’s
            source records personal, opinionated preferences. Use each
            practice in the context of your project’s requirements.
          </p>
        </section>

        <section className="sources-snapshots">
          <h3>Content snapshots</h3>
          <p>
            The content is pinned to the revisions above. It does not update
            automatically when an upstream source changes. The Handbook revision
            identifies the last change to that source file, rather than the
            latest commit of the entire website.
          </p>
        </section>

        <section className="sources-redistribution">
          <h3>Redistribution</h3>
          <p>
            Application, API, and MCP server code is MIT licensed. Content derived
            from André de Sousa’s guide retains its MIT license and copyright
            © 2021 André de Sousa.
          </p>
          <p>
            Content adapted from the TypeScript documentation is licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            , credited to Microsoft and the TypeScript contributors. Changes
            include rewritten explanations, new examples, grouping, and context
            notes. Keep the attribution, source links, license notices, and
            modification details when redistributing the content.
          </p>
          <p>Viraj Shah’s personal configurations are included with his approval. A separate content license has not been specified.</p>
          <div className="sources-notice-links">
            <a
              href={`${REPOSITORY}/blob/main/THIRD_PARTY_NOTICES.md`}
              target="_blank"
              rel="noreferrer"
            >
              Full source notices
            </a>
            <a
              href={`${REPOSITORY}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              Application license
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
