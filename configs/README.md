# Viraj Shah’s configurations

These are opinionated configuration snapshots approved by Viraj Shah. They are reference content; they do not configure this website’s own tooling.

- [Prettier configuration](viraj.prettierrc.json): LF line endings, print width 80, four spaces, single quotes, and no statement-ending semicolons. The other approved formatting settings are preserved.
- [ESLint configuration](viraj.eslint.config.cts): complexity 20 as a warning, maximum 300 lines per file excluding blank lines and comments, maximum line length 80 as an error, and `curly: ["error", "multi"]`.

Both configurations originate from management-ui. The Prettier snapshot changes `endOfLine` from `auto` to `lf` and `printWidth` from 180 to 80. The ESLint snapshot changes only the complexity, file-length, and line-length thresholds; the other rules, severities, presets, and overrides are preserved.

## Use in a project

Copy `viraj.eslint.config.cts` to the target project root as `eslint.config.cts`, and copy `viraj.prettierrc.json` beside it as `.prettierrc`. ESLint’s Prettier plugin reads that formatting configuration. Do not copy these files into this website’s root merely to browse them.

The ESLint file retains the Next.js presets, TypeScript recommended rules, Prettier compatibility preset, and ESLint-comments recommended rules from management-ui. Its Mira Pro ignore paths, monorepo overrides, MUI icon import restriction, and parent-relative import restriction require review for a different project. It uses the legacy Next.js preset through `FlatCompat` and retains `ecmaVersion: 5` from the original configuration. This is not a framework-neutral preset.

The following tool versions reproduce the source project’s dependency setup. Install them as development dependencies in the target project, not this reference site:

```json
{
  "devDependencies": {
    "@eslint/eslintrc": "3.3.6",
    "@types/node": "25.9.5",
    "@typescript-eslint/eslint-plugin": "8.67.0",
    "@typescript-eslint/parser": "8.67.0",
    "eslint": "9.39.5",
    "eslint-config-next": "15.5.12",
    "eslint-config-prettier": "8.10.0",
    "eslint-plugin-eslint-comments": "3.2.0",
    "eslint-plugin-import": "2.32.0",
    "eslint-plugin-jsdoc": "50.7.1",
    "eslint-plugin-prettier": "4.2.1",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "5.2.0",
    "eslint-plugin-react-perf": "3.3.1",
    "jiti": "2.7.0",
    "prettier": "2.8.8",
    "typescript": "5.8.3"
  }
}
```

ESLint 9 uses Jiti to load this TypeScript `.cts` configuration. The source project runs Node 26 and npm 11. After adapting project paths and installing the dependencies, inspect a representative file’s effective configuration with `npx eslint --config eslint.config.cts --print-config src/example.tsx` before linting your project.

Prettier’s `printWidth: 80` is a wrapping target. ESLint’s `max-len: 80` is a hard cap, so long strings, URLs, and comments can still require manual changes after formatting. `curly: "multi"` requires braces for multiple statements and rejects unnecessary braces around a single statement. The core `max-len` rule is retained from the source snapshot even though ESLint deprecates it in favor of the Stylistic equivalent.

No separate content license has been specified for these personal configurations. The website’s application license does not replace that source status.
