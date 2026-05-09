import type { z } from "zod";
import type {
  AgentResponseSchema,
  ExtractorOutputSchema,
  ValidatorOutputSchema,
  WebSearchOutputSchema,
} from "@/lib/agent/schemas";

export type StreamPhase =
  | "extract"
  | "research"
  | "generate"
  | "translate"
  | "complete"
  | "error";

export type ExtractPayload = z.infer<typeof ExtractorOutputSchema>;
export type ResearchPayload = {
  webSearch: z.infer<typeof WebSearchOutputSchema>;
  validator: z.infer<typeof ValidatorOutputSchema>;
};
export type GeneratePayload = {
  stepsCount: number;
  documentsCount: number;
  requiredDocumentsCount: number;
};
export type TranslatePayload = { available: boolean };
export type CompletePayload = z.infer<typeof AgentResponseSchema>;
export type ErrorPayload = { message: string };

export type StreamEventMap = {
  extract: ExtractPayload;
  research: ResearchPayload;
  generate: GeneratePayload;
  translate: TranslatePayload;
  complete: CompletePayload;
  error: ErrorPayload;
};

export type StreamEvent<P extends StreamPhase = StreamPhase> = {
  phase: P;
  data: StreamEventMap[P];
};

export type OnPhase = <P extends StreamPhase>(
  phase: P,
  data: StreamEventMap[P],
) => void;

export function encodeSSE(phase: StreamPhase, data: unknown): string {
  return `event: ${phase}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function parseSSE(raw: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const chunks = raw.split("\n\n").filter(Boolean);
  for (const chunk of chunks) {
    const eventMatch = chunk.match(/^event:\s*(.+)$/m);
    const dataMatch = chunk.match(/^data:\s*(.+)$/m);
    if (eventMatch && dataMatch) {
      try {
        events.push({
          phase: eventMatch[1] as StreamPhase,
          data: JSON.parse(dataMatch[1]),
        });
      } catch {
        /* skip malformed */
      }
    }
  }
  return events;
}
