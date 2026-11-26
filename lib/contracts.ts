import { z } from "zod";
import { PracticeSchema, SourceSchema, LicenseNoticeSchema } from "./models.ts";
import { categoryIds, contextIds, environmentIds, sourceIds } from "./taxonomy.ts";

export const PracticeIdSchema = z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const MetaSchema = z.object({ schemaVersion: z.literal("2"), datasetVersion: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict();
export const SearchInputSchema = z.object({
  q: z.string().max(300).optional(),
  category: z.enum(categoryIds).optional(),
  source: z.enum(sourceIds).optional(),
  context: z.enum(contextIds).optional(),
  environment: z.enum(environmentIds).optional(),
  tag: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(100000).optional(),
}).strict();
export const EmptyInputSchema = z.object({}).strict();
export const PracticeInputSchema = z.object({ id: PracticeIdSchema }).strict();
export const BatchInputSchema = z.object({
  ids: z.array(PracticeIdSchema).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, { message: "IDs must be unique." }).meta({ uniqueItems: true }),
}).strict();
export const SearchSummarySchema = z.object({
  id: PracticeIdSchema,
  title: z.string().min(1), summary: z.string().min(1), category: z.enum(categoryIds),
  contexts: z.array(z.enum(contextIds)), environments: z.array(z.enum(environmentIds)),
  sourceIds: z.array(z.enum(sourceIds)), tags: z.array(z.string()),
  match: z.object({ matchedFields: z.array(z.string()), snippet: z.string() }).strict(),
  links: z.object({ self: z.string().startsWith("/api/"), page: z.url() }).strict(),
}).strict();
export const SearchResponseSchema = z.object({
  data: z.array(SearchSummarySchema),
  meta: MetaSchema.extend({
    total: z.number().int().nonnegative(), limit: z.number().int().min(1).max(100), offset: z.number().int().nonnegative(),
    hasMore: z.boolean(), nextOffset: z.number().int().nonnegative().nullable(),
    query: z.object({ text: z.string(), terms: z.array(z.string()) }).strict(),
  }).strict(),
}).strict();
export const PracticeResponseSchema = z.object({ data: PracticeSchema, meta: MetaSchema }).strict();
export const BatchResponseSchema = z.object({ data: z.array(PracticeSchema).max(20), missingIds: z.array(PracticeIdSchema), meta: MetaSchema }).strict();
export const TaxonSchema = z.object({ id: z.string().min(1), label: z.string().min(1), count: z.number().int().nonnegative() }).strict();
export const TaxonomyResponseSchema = z.object({
  data: z.object({ categories: z.array(TaxonSchema), contexts: z.array(TaxonSchema), environments: z.array(TaxonSchema), tags: z.array(TaxonSchema), sources: z.array(TaxonSchema) }).strict(),
  meta: MetaSchema,
}).strict();
export const SourcesResponseSchema = z.object({ data: z.array(SourceSchema), meta: MetaSchema }).strict();
export const CatalogueSchema = MetaSchema.extend({ sources: z.array(SourceSchema), practices: z.array(PracticeSchema), licenseNotices: z.array(LicenseNoticeSchema) }).strict();
export const ManifestSchema = MetaSchema.extend({
  practiceCount: z.number().int().nonnegative(), sourceCount: z.number().int().nonnegative(),
  links: z.object({ json: z.url(), markdown: z.url(), schema: z.url(), openapi: z.url() }).strict(),
}).strict();
export const CatalogueFormatSchema = z.object({ format: z.enum(["json", "markdown"]).optional() }).strict();
export const HealthSchema = z.object({ status: z.literal("ok"), version: z.literal("2.0.0"), meta: MetaSchema }).strict();
export const ProblemErrorSchema = z.object({ parameter: z.string(), code: z.string(), message: z.string() }).strict();
export const ProblemSchema = z.object({
  type: z.string(), title: z.string(), status: z.number().int().min(400).max(599), detail: z.string(),
  instance: z.string(), code: z.string(), errors: z.array(ProblemErrorSchema),
}).strict();
export type Problem = z.infer<typeof ProblemSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type SearchSummary = z.infer<typeof SearchSummarySchema>;
export type Meta = z.infer<typeof MetaSchema>;

export const contractSchemas = {
  Practice: PracticeSchema, Source: SourceSchema, Meta: MetaSchema,
  SearchInput: SearchInputSchema, SearchSummary: SearchSummarySchema, SearchResponse: SearchResponseSchema,
  PracticeInput: PracticeInputSchema, PracticeResponse: PracticeResponseSchema,
  BatchInput: BatchInputSchema, BatchResponse: BatchResponseSchema,
  TaxonomyResponse: TaxonomyResponseSchema, SourcesResponse: SourcesResponseSchema,
  Catalogue: CatalogueSchema, CatalogueManifest: ManifestSchema, CatalogueFormat: CatalogueFormatSchema,
  Health: HealthSchema, Problem: ProblemSchema,
};
export function jsonSchema(schema: z.ZodType, input = false) {
  const generated = z.toJSONSchema(schema, { target: "draft-2020-12", io: input ? "input" : "output" });
  const { $schema: _dialect, ...result } = generated;
  return result;
}
export function catalogueSchemaDocument(origin: string) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${origin}/api/v1/schema.json`, title: "TypeScript Practices contracts",
    $ref: "#/$defs/Catalogue",
    $defs: Object.fromEntries(Object.entries(contractSchemas).map(([name, schema]) => [name, jsonSchema(schema)])),
  };
}
