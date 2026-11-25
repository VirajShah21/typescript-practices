# Contributing

Keep guidance clear, practical, and linked to its source.

- Edit `data/practices.json` for content changes. Preserve stable IDs so saved links and API clients continue to work.
- Explain whether a recommendation applies to application code or declaration files. Add context when a source makes a claim that depends on the project or runtime.
- Write original code examples. Retain source attribution, license details, and the modification notice in `THIRD_PARTY_NOTICES.md`.
- Keep the website, REST API, and MCP tools on the same catalogue and query implementation.
- Run `npm test` and `npx tsc --noEmit` before submitting a change. Run `npm run build` for website or route changes.

Include the problem, the resulting behavior, and relevant checks in a pull request.
