# Source notices

The application, API, and MCP server implementation are distributed under the project’s MIT license. That license does not replace the upstream licenses below. Catalogue records identify their source with `source` and `sourceUrl`; retain those fields when redistributing the data.

## TypeScript Best Practices

- Author: André de Sousa
- Source: https://github.com/andredesousa/typescript-best-practices
- Revision: `aaedb9fadd42711e30a9eb984c2b10d4abaab71c`
- License: MIT
- Copyright: Copyright (c) 2021 André de Sousa
- Full license: [licenses/andredesousa-MIT.txt](licenses/andredesousa-MIT.txt)

The 50 catalogue entries with `source: "community"` adapt the source’s practices. Summaries and explanations have been rewritten, examples have been newly written, and caveats identify advice that needs context or updating. The source titles remain available as `sourceTitle`. These adaptations retain the MIT license and notice above.

## TypeScript Handbook: Do’s and Don’ts

- Attribution: Microsoft and TypeScript contributors
- Source: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Source file: https://github.com/microsoft/TypeScript-Website/blob/a03790f13df45ca6302abae688432762121db3c8/packages/documentation/copy/en/declaration-files/Do%27s%20and%20Don%27ts.md
- Revision of source file: `a03790f13df45ca6302abae688432762121db3c8`
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License link: https://creativecommons.org/licenses/by/4.0/
- Upstream license: https://github.com/microsoft/TypeScript-Website/blob/v2/LICENSE
- Full license: [licenses/typescript-website-CC-BY-4.0.txt](licenses/typescript-website-CC-BY-4.0.txt)

The 9 catalogue entries with `source: "handbook"` adapt the handbook’s declaration-file guidance. The prose has been condensed and rewritten, original examples replace the source examples, and scope and caveat fields clarify where the guidance applies. These adapted records are distributed under CC BY 4.0. Keep the attribution, source and license links, and this modification notice with copies or further adaptations.

This project is an independent reference. The source authors do not endorse it.

## Editorial updates

Both sources were checked on 2026-11-25. This is a curated snapshot, not an automatically synchronized copy. The revision for the handbook identifies the last change to that source file, rather than the latest commit of the entire website repository.

The catalogue covers all 50 community practices and all 9 actionable handbook subsections. It preserves source links while qualifying absolute or dated claims. In particular:

- Type inference is supported and often avoids redundant annotations: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-annotations-on-variables
- The strict family can change with the compiler version: https://www.typescriptlang.org/tsconfig/strict.html
- Callback and overload recommendations retain their declaration-file context, including the same-return-type condition for optional parameters: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- Module scripts defer by default; classic scripts can use `defer` or `async` according to their ordering requirements: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script
- Performance recommendations are treated as measurement decisions, rather than universal claims about native APIs, libraries, or loop syntax.

The catalogue’s original good/bad examples are illustrative fragments. They may depend on the surrounding context named in the example; they are not a complete application or a static analyzer.
