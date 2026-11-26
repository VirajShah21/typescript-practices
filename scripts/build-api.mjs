import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist/public-api", { recursive: true });
const dependencyNotices = await Promise.all([
  readFile("node_modules/zod/LICENSE", "utf8"),
  readFile("node_modules/@noble/hashes/LICENSE", "utf8"),
]);
const banner = "// Source: https://github.com/VirajShah21/typescript-practices\n" + dependencyNotices.map((notice, index) => `/*! ${index === 0 ? "Zod" : "@noble/hashes"} license\n${notice.replaceAll("*/", "* /")}\n*/`).join("\n");
await build({
  entryPoints: ["server/worker.ts"], outfile: "dist/public-api/index.js",
  bundle: true, format: "esm", platform: "browser", target: "es2022",
  minify: true, legalComments: "inline",
  banner: { js: banner },
});
await writeFile("dist/public-api/wrangler.json", JSON.stringify({
  name: "typescript-practices-api-local", main: "index.js", compatibility_date: "2026-05-15",
  compatibility_flags: ["nodejs_compat"],
}, null, 2));
console.log("Built the public API Worker at dist/public-api/index.js");
