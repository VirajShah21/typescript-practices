import { Github } from "./primitives";
import "./sources.css";

type Source = {
  id: string;
  title: string;
  author: string;
  url: string;
  license: string;
  licenseUrl: string;
  revision: string;
  checkedAt: string;
};

type Practice = { source: string };

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
  return source.id === "handbook"
    ? `https://github.com/microsoft/TypeScript-Website/commit/${source.revision}`
    : `https://github.com/andredesousa/typescript-best-practices/commit/${source.revision}`;
}

export default function Sources({
  sources,
  practices,
}: {
  sources: Source[];
  practices: Practice[];
}) {
  return (
    <div className="sources-page">
      <header className="sources-intro">
        <h1>Sources &amp; licenses</h1>
        <p>
          Two sources, brought together with the context to use them well.
          Every practice links to its original guidance.
        </p>
      </header>

      <div className="sources-grid">
        {sources.map((source) => {
          const isHandbook = source.id === "handbook";
          const count = practices.filter(
            (practice) => practice.source === source.id,
          ).length;

          return (
            <section className="sources-card" key={source.id}>
              <div className="sources-identity">
                <div
                  className={`sources-icon ${isHandbook ? "sources-icon-typescript" : "sources-icon-github"}`}
                  aria-hidden="true"
                >
                  {isHandbook ? <span>TS</span> : <Github size={34} />}
                </div>
                <span>
                  {isHandbook ? "Official documentation" : "Community guide"}
                </span>
              </div>

              <h2>{source.title}</h2>
              <p className="sources-author">By {source.author}</p>
              <p className="sources-description">
                {isHandbook
                  ? `${count} guidelines for declaration files, callback contracts, and function overloads.`
                  : `${count} practices for project conventions, maintainable code, and runtime behavior.`}
              </p>
              <a
                className="sources-original"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                Read the original
              </a>

              <dl className="sources-metadata">
                <div>
                  <dt>License</dt>
                  <dd>
                    <a
                      href={source.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.license === "CC-BY-4.0"
                        ? "Creative Commons Attribution 4.0"
                        : source.license}
                    </a>
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
            or an endorsement by the original authors.
          </p>
          <p>
            The Handbook guidance applies to declaration files and public API
            design. The community guide describes project conventions. Use each
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
