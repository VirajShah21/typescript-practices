# Source notices

The application, API, and MCP server implementation are distributed under the project’s MIT license. That license does not replace the upstream licenses below. Catalogue records identify their sources with `citations`, including section links and an `origin` or `supports` role. Retain citations, source snapshots, these modification details, and the full license notices when redistributing the data.

## TypeScript Best Practices

- Author: André de Sousa
- Source: https://github.com/andredesousa/typescript-best-practices
- Revision: `aaedb9fadd42711e30a9eb984c2b10d4abaab71c`
- License: MIT
- Copyright: Copyright (c) 2021 André de Sousa
- Full license: [licenses/andredesousa-MIT.txt](licenses/andredesousa-MIT.txt)

The 50 catalogue entries whose citations include `sourceId: "community"` and `role: "origin"` adapt the source’s practices. Summaries and explanations have been rewritten, examples have been newly written, and applicability conditions and notes identify advice that needs context or updating. Original section titles remain available as each citation’s `section`. These adaptations retain the MIT license and notice above.

## TypeScript Handbook: Do’s and Don’ts

- Attribution: Microsoft and TypeScript contributors
- Source: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Source file: https://github.com/microsoft/TypeScript-Website/blob/a03790f13df45ca6302abae688432762121db3c8/packages/documentation/copy/en/declaration-files/Do%27s%20and%20Don%27ts.md
- Revision of source file: `a03790f13df45ca6302abae688432762121db3c8`
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License link: https://creativecommons.org/licenses/by/4.0/
- Upstream license: https://github.com/microsoft/TypeScript-Website/blob/v2/LICENSE
- Full license: [licenses/typescript-website-CC-BY-4.0.txt](licenses/typescript-website-CC-BY-4.0.txt)

The 9 catalogue entries whose citations include `sourceId: "handbook"` and `role: "origin"` adapt the handbook’s declaration-file guidance. The prose has been condensed and rewritten, original examples replace the source examples, and structured applicability and notes clarify where the guidance applies. These adapted records are distributed under CC BY 4.0. Keep the attribution, source and license links, and this modification notice with copies or further adaptations.

Supporting citations connect overlapping advice without changing which source supplied an entry’s adaptation. The `avoid-any` and `unknown-over-any` entries retain their separate IDs and originating licenses while citing each other’s source sections for support. Determine origin counts and the classifications above using citations with `role: "origin"`, rather than all appearances of a source.

This project is an independent reference. The source authors do not endorse it.

## Editorial updates

The community and Handbook sources were checked on 2026-11-25. This is a curated snapshot, not an automatically synchronized copy. The revision for the handbook identifies the last change to that source file, rather than the latest commit of the entire website repository.

The catalogue covers all 50 community practices and all 9 actionable handbook subsections. It preserves source links while qualifying absolute or dated claims. In particular:

- Type inference is supported and often avoids redundant annotations: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-annotations-on-variables
- The strict family can change with the compiler version: https://www.typescriptlang.org/tsconfig/strict.html
- Callback and overload recommendations retain their declaration-file context, including the same-return-type condition for optional parameters: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Module scripts defer by default; classic scripts can use `defer` or `async` according to their ordering requirements: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
- Performance recommendations are treated as measurement decisions, rather than universal claims about native APIs, libraries, or loop syntax.

## Structured catalogue

Schema version 2 preserves all 59 practice IDs. It adds machine-readable contexts, environments, conditions, exceptions, citations, note types, example languages and variants, and typed relations with reasons. Categories use stable machine IDs with separate display labels. `runtime-independent` means a recommendation does not depend on a browser or Node-specific API; a browser-only example does not by itself limit a general recommendation to the browser.

Notes distinguish source exceptions, historical context, and editorial corrections. References in editorial notes identify supporting documentation where available; an editorial placement or style preference does not imply an upstream endorsement. Editorial references were checked during the schema migration on 2026-11-26. The two originating source snapshots and their original checked date, 2026-11-25, remain unchanged.

Examples are original illustrative fragments and have `verification.status: "illustrative"`. Their explanations record relevant surrounding context, API assumptions, and cases where both variants may be valid. No compiler version, successful compilation, benchmark result, or runtime execution is implied by that status.

Full upstream license texts are also included in [data/license-notices.json](data/license-notices.json) for offline exports. Each notice identifies its source and license. A copy of the catalogue should carry both its source metadata and the complete applicable notices, even when there is no network access to follow a source link.

## Viraj Shah — personal preferences

The `viraj` source contains Viraj Shah’s opinionated Prettier and ESLint preferences, approved on 2026-11-26. Prettier was imported from management-ui with `endOfLine` changed from `auto` to `lf` and `printWidth` changed from 180 to 80. ESLint was imported with complexity changed from 35 to 20, max-lines from 500 to 300, and max-len from 180 to 80. The `curly: "multi"` setting and all other semantic settings are preserved. Formatting of the ESLint snapshot follows the approved Prettier configuration. Project-specific ESLint presets, ignore paths, import restrictions, and overrides remain identified as part of the source snapshot.

The complete approved files are in [configs/viraj.prettierrc.json](configs/viraj.prettierrc.json) and [configs/viraj.eslint.config.cts](configs/viraj.eslint.config.cts), with setup instructions in [configs/README.md](configs/README.md). Its immutable public revision is recorded in data/sources.json. This source has no separate content license specified (`LicenseRef-Unspecified`); the application MIT license does not grant a license to this source.
