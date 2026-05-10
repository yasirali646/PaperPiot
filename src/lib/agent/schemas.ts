import { z } from "zod";

export const ProcessTypeSchema = z.enum([
  "domicile",
  "passport",
  "university",
  "other",
]);

export const NavigatorStepSchema = z.object({
  title: z.string().min(1),
  details: z.string().min(1),
  officeOrPortal: z.string().min(1),
});

export const DocumentSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
});

export const ClarificationOutputSchema = z.object({
  required: z.boolean().default(false),
  missingFields: z.array(z.string().min(1)).default([]),
  questions: z.array(z.string().min(1)).default([]),
});

/** Single LLM call output: intent summary + navigator + documents. */
export const FullOutputSchema = z.object({
  intentSummary: z.string().min(1),
  steps: z.array(NavigatorStepSchema).min(1),
  requiredDocuments: z.array(z.string().min(1)).min(1),
  feesAndTimelines: z.array(z.string().min(1)).default([]),
  documents: z.array(DocumentSchema).min(1),
});

export const AgentResponseSchema = z.object({
  processType: ProcessTypeSchema,
  intentSummary: z.string().min(1),
  navigator: z.object({
    steps: z.array(NavigatorStepSchema).min(1),
    requiredDocuments: z.array(z.string().min(1)).min(1),
    feesAndTimelines: z.array(z.string().min(1)).default([]),
  }),
  documentGenerator: z.object({
    documents: z.array(DocumentSchema).min(1),
  }),
  clarification: ClarificationOutputSchema.default({
    required: false,
    missingFields: [],
    questions: [],
  }),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
