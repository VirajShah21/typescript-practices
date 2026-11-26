# Contributing

Keep guidance clear, practical, and linked to its source.

- Edit `data/practices.json` for guidance and `data/sources.json` for upstream metadata. Preserve stable practice IDs.
- Follow the strict schemas in `lib/models.ts`. Use category, context, and environment IDs from `lib/taxonomy.ts`.
- Describe applicability with conditions and exceptions. Classify notes as editorial corrections, exceptions, or historical context, and link supporting references.
- Identify each originating citation with `role: "origin"`. Additional supporting citations use `role: "supports"`.
- Give examples the correct language, role-labelled variants, an explanation, and an accurate verification status. Current examples are illustrative fragments.
- Explain relationships using a known practice ID, kind, and reason. Do not introduce dangling relations or unknown source IDs.
- Retain attribution, license notices, and modification details. Catalogue exports include the full notices from `data/license-notices.json`.
- Keep browser, API, and MCP search on `lib/search.ts`. Update the shared contracts when changing API or MCP input/output shapes.
- Run `npm test` and `npm run typecheck`. Run `npm run build` for website or route changes.

Include the problem, resulting behavior, and relevant checks in a pull request. Source check dates describe an upstream review; do not change them for presentation-only edits.
