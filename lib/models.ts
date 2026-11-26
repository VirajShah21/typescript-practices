import { z } from "zod";
import { categoryIds, contextIds, environmentIds, sourceIds } from "./taxonomy.ts";

export const SCHEMA_VERSION = "2" as const;

const TextSchema = z.string().min(1).regex(/\S/, "Must contain non-whitespace text.");
export const SlugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Must be a lowercase kebab-case identifier.",
);
export const HttpsUrlSchema = z.url({ protocol: /^https$/ });
export const CategorySchema = z.enum(categoryIds);
export const ContextSchema = z.enum(contextIds);
export const EnvironmentSchema = z.enum(environmentIds);
export const SourceIdSchema = z.enum(sourceIds);

function uniqueArray<T extends z.ZodType>(
  item: T,
  key: (value: z.output<T>) => string = (value) => JSON.stringify(value),
) {
  return z.array(item).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const identity = key(value);
      if (seen.has(identity)) {
        context.addIssue({ code: "custom", message: "Array items must be unique.", path: [index] });
      }
      seen.add(identity);
    });
  }).meta({ uniqueItems: true });
}

export const ApplicabilitySchema = z.strictObject({
  contexts: uniqueArray(ContextSchema).min(1),
  environments: uniqueArray(EnvironmentSchema).min(1),
  when: uniqueArray(TextSchema).describe("Conditions under which the recommendation applies."),
  exceptions: uniqueArray(TextSchema).describe(
    "Situations where a different approach is appropriate instead of the recommendation. Empty when no exception is documented; general facts and warnings belong in the explanation or notes.",
  ),
});

export const CitationSchema = z.strictObject({
  sourceId: SourceIdSchema,
  section: TextSchema,
  url: HttpsUrlSchema,
  role: z.enum(["origin", "supports"]),
});

export const ReferenceSchema = z.strictObject({
  title: TextSchema,
  url: HttpsUrlSchema,
});

export const NoteSchema = z.strictObject({
  kind: z.enum(["exception", "editorial-correction", "historical-context"]),
  text: TextSchema,
  references: uniqueArray(ReferenceSchema, (reference) => reference.url),
});

export const ExampleVariantSchema = z.strictObject({
  role: z.enum(["avoid", "prefer", "alternative", "tradeoff"]),
  code: TextSchema,
});

export const ExampleSchema = z.strictObject({
  id: SlugSchema,
  language: z.enum(["typescript", "javascript", "html", "json", "shell"]),
  variants: uniqueArray(ExampleVariantSchema, (variant) => variant.role).min(1),
  explanation: TextSchema,
  verification: z.strictObject({ status: z.literal("illustrative") }),
});

export const RelationSchema = z.strictObject({
  practiceId: SlugSchema,
  kind: z.enum(["related", "complements", "alternative", "prerequisite"]),
  reason: TextSchema,
});

export const PracticeSchema = z.strictObject({
  id: SlugSchema,
  title: TextSchema,
  summary: TextSchema,
  explanation: TextSchema,
  category: CategorySchema,
  applicability: ApplicabilitySchema,
  tags: uniqueArray(SlugSchema),
  citations: uniqueArray(CitationSchema, (citation) => `${citation.sourceId}:${citation.url}`).min(1),
  notes: uniqueArray(NoteSchema, (note) => `${note.kind}:${note.text}`),
  examples: uniqueArray(ExampleSchema, (example) => example.id),
  relations: uniqueArray(RelationSchema, (relation) => relation.practiceId),
});

export const SourceSchema = z.strictObject({
  id: SourceIdSchema,
  title: TextSchema,
  author: TextSchema,
  url: HttpsUrlSchema,
  license: z.enum(["MIT", "CC-BY-4.0"]),
  licenseUrl: HttpsUrlSchema,
  revision: z.string().regex(/^[a-f0-9]{40}$/, "Must be a full Git commit SHA."),
  checkedAt: z.iso.date(),
});

export const LicenseNoticeSchema = z.strictObject({
  sourceId: SourceIdSchema,
  license: z.enum(["MIT", "CC-BY-4.0"]),
  text: TextSchema,
});

export const PracticesSchema = uniqueArray(PracticeSchema, (practice) => practice.id);
export const SourcesSchema = uniqueArray(SourceSchema, (source) => source.id);
export const LicenseNoticesSchema = uniqueArray(LicenseNoticeSchema, (notice) => notice.sourceId);

export type Category = z.infer<typeof CategorySchema>;
export type Context = z.infer<typeof ContextSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type SourceId = z.infer<typeof SourceIdSchema>;
export type Practice = z.infer<typeof PracticeSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Example = z.infer<typeof ExampleSchema>;
export type LicenseNotice = z.infer<typeof LicenseNoticeSchema>;
