import { z } from "zod";

export const WebSearchResultItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

export const WebSearchOutputSchema = z.object({
  provider: z.enum(["tavily", "duckduckgo", "none"]),
  queries: z.array(z.string()),
  results: z.array(WebSearchResultItemSchema),
  warning: z.string().optional(),
});

export const ProcessTypeSchema = z.enum([
  "domicile",
  "passport",
  "university",
  "other",
]);

export const ExtractorOutputSchema = z.object({
  processType: ProcessTypeSchema,
  intentSummary: z.string().min(1),
  assumedJurisdiction: z
    .string()
    .min(1)
    .describe("E.g. Pakistan, Punjab, Sindh; include if inferable."),
  requiredFields: z
    .array(z.object({ key: z.string().min(1), label: z.string().min(1) }))
    .min(1),
  questionsToAsk: z.array(z.string().min(1)).default([]),
});

export const ValidatorOutputSchema = z.object({
  missingFields: z.array(z.string().min(1)).default([]),
  risksOrWarnings: z.array(z.string().min(1)).default([]),
  nextBestQuestion: z.string().min(1),
});

export const NavigatorStepSchema = z.object({
  title: z.string().min(1),
  details: z.string().min(1),
  officeOrPortal: z.string().min(1),
});

export const NavigatorOutputSchema = z.object({
  steps: z.array(NavigatorStepSchema).min(1),
  requiredDocuments: z.array(z.string().min(1)).min(1),
  feesAndTimelines: z.array(z.string().min(1)).default([]),
});

export const DocumentSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
});

export const DocumentGeneratorOutputSchema = z.object({
  documents: z.array(DocumentSchema).min(1),
});

export const UrduStepSchema = z.object({
  title: z.string().min(1),
  details: z.string().min(1),
  officeOrPortal: z.string().min(1),
});

export const UrduDocumentSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
});

export const UrduTranslationOutputSchema = z.object({
  intentSummary: z.string().min(1),
  steps: z.array(UrduStepSchema).min(1),
  requiredDocuments: z.array(z.string().min(1)).min(1),
  feesAndTimelines: z.array(z.string().min(1)).default([]),
  documents: z.array(UrduDocumentSchema).min(1),
});

export const ClarificationOutputSchema = z.object({
  required: z.boolean().default(false),
  missingFields: z.array(z.string().min(1)).default([]),
  questions: z.array(z.string().min(1)).default([]),
});

/** Single LLM call: navigator fields plus draft documents (faster than two calls). */
export const NavigatorAndDocumentsOutputSchema = NavigatorOutputSchema.extend({
  documents: z.array(DocumentSchema).min(1),
});

export const AgentResponseSchema = z.object({
  extractor: ExtractorOutputSchema,
  validator: ValidatorOutputSchema,
  webSearch: WebSearchOutputSchema,
  navigator: NavigatorOutputSchema,
  documentGenerator: DocumentGeneratorOutputSchema,
  urdu: UrduTranslationOutputSchema.optional(),
  clarification: ClarificationOutputSchema.default({
    required: false,
    missingFields: [],
    questions: [],
  }),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
