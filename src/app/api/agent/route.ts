import { z } from "zod";
import { runAgentWorkflow } from "@/lib/agent/workflow";
import { encodeSSE, type StreamPhase } from "@/lib/agent/stream-events";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof RequestSchema>;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = <P extends StreamPhase>(phase: P, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(encodeSSE(phase, data)));
        } catch {
          /* stream already closed */
        }
      };

      try {
        await runAgentWorkflow({
          message: parsed.message,
          onPhase: send,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error while running agent.";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
