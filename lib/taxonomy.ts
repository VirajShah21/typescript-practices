export const categoryIds = [
  "types",
  "functions",
  "code-structure",
  "runtime",
  "tooling",
  "declarations",
] as const;

export const contextIds = [
  "application",
  "declaration-file",
  "public-api",
  "compiler-configuration",
] as const;

export const environmentIds = ["browser", "node", "runtime-independent"] as const;
export const sourceIds = ["community", "handbook"] as const;

export const categories = [
  { id: "types", label: "Types" },
  { id: "functions", label: "Functions" },
  { id: "code-structure", label: "Code structure" },
  { id: "runtime", label: "Runtime" },
  { id: "tooling", label: "Tooling" },
  { id: "declarations", label: "Declarations" },
] as const;

export const contexts = [
  { id: "application", label: "Application code" },
  { id: "declaration-file", label: "Declaration files" },
  { id: "public-api", label: "Public APIs" },
  { id: "compiler-configuration", label: "Compiler configuration" },
] as const;

export const environments = [
  { id: "browser", label: "Browser" },
  { id: "node", label: "Node.js" },
  { id: "runtime-independent", label: "Runtime independent" },
] as const;
