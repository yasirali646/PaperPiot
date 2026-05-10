import { ChatOpenAI } from "@langchain/openai";
import { globalLlmCache } from "@/lib/agent/llm-cache";
import { parseTimeoutMs } from "@/lib/agent/timeouts";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getLLM() {
  const apiKey = process.env.OPENAI_API_KEY ?? requiredEnv("LLM_API_KEY");
  const model = process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-4o-mini";
  const baseURL =
    process.env.OPENAI_BASE_URL ??
    process.env.OPENAI_API_BASE ??
    process.env.LLM_BASE_URL;

  const timeout = parseTimeoutMs(
    process.env.LLM_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT_MS,
    180_000,
  );
  let maxRetries = 1;
  if (
    process.env.LLM_MAX_RETRIES != null &&
    process.env.LLM_MAX_RETRIES !== ""
  ) {
    const p = Number.parseInt(process.env.LLM_MAX_RETRIES, 10);
    maxRetries = Number.isFinite(p) ? Math.min(3, Math.max(0, p)) : 1;
  }

  const useCache = process.env.DISABLE_LLM_CACHE !== "1";

  return new ChatOpenAI({
    apiKey,
    model,
    temperature: 0,
    timeout,
    maxRetries,
    configuration: baseURL ? { baseURL } : undefined,
    cache: useCache ? globalLlmCache : undefined,
  });
}
