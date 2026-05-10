import type { z } from "zod";
import type {
  AgentResponseSchema,
  ClarificationOutputSchema,
  ProcessTypeSchema,
} from "@/lib/agent/schemas";

export type StreamPhase =
  | "extract"
  | "generate"
  | "complete"
  | "error";

export type ExtractPayload = {
  processType: z.infer<typeof ProcessTypeSchema>;
  clarification: z.infer<typeof ClarificationOutputSchema>;
};
export type GeneratePayload = {
  stepsCount: number;
  documentsCount: number;
  requiredDocumentsCount: number;
};
export type CompletePayload = z.infer<typeof AgentResponseSchema>;
export type ErrorPayload = { message: string };

export type StreamEventMap = {
  extract: ExtractPayload;
  generate: GeneratePayload;
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
