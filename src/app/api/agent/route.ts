import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgentWorkflow } from "@/lib/agent/workflow";

export const runtime = "nodejs";
/** Serverless ceiling; align with `AGENT_WORKFLOW_TIMEOUT_MS` on your host. */
export const maxDuration = 900;

const RequestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { message } = RequestSchema.parse(json);

    const result = await runAgentWorkflow({ message });
    return NextResponse.json(result);
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : "Unknown error while running agent.";
    const timedOut =
      /timed out|timeout/i.test(errMessage) ||
      (err instanceof Error && err.name === "AbortError");
    return NextResponse.json(
      { error: errMessage },
      { status: timedOut ? 504 : 400 },
    );
  }
}
