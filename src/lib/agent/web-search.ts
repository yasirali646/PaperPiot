import { z } from "zod";
import {
  WebSearchOutputSchema,
  WebSearchResultItemSchema,
} from "@/lib/agent/schemas";
import { parseTimeoutMs, withTimeout } from "@/lib/agent/timeouts";

export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;

type WebSearchResultItem = z.infer<typeof WebSearchResultItemSchema>;

const MAX_QUERIES = 2;
const MAX_RESULTS_PER_QUERY = 3;
const MAX_RESULTS_TOTAL = 5;

const tavilyFetchMs = () =>
  parseTimeoutMs(process.env.TAVILY_TIMEOUT_MS, 25_000);
const duckDuckGoMs = () =>
  parseTimeoutMs(process.env.DUCKDUCKGO_TIMEOUT_MS, 30_000);

async function searchTavily(
  query: string,
  apiKey: string,
): Promise<WebSearchResultItem[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(tavilyFetchMs()),
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: MAX_RESULTS_PER_QUERY,
      search_depth: "basic",
    }),
  });
  const json = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? `Tavily HTTP ${res.status}`);
  }
  if (!Array.isArray(json.results)) return [];
  return json.results
    .filter((r) => r.url && (r.title || r.content))
    .map((r) => ({
      title: r.title ?? "Untitled",
      url: r.url as string,
      snippet: (r.content ?? "").slice(0, 2000),
    }));
}

async function searchDuckDuckGo(query: string): Promise<WebSearchResultItem[]> {
  const { DuckDuckGoSearch } = await import(
    "@langchain/community/tools/duckduckgo_search"
  );
  const tool = new DuckDuckGoSearch({ maxResults: MAX_RESULTS_PER_QUERY });
  const raw = await withTimeout(
    tool.invoke(query),
    duckDuckGoMs(),
    "DuckDuckGo search",
  );
  const text = typeof raw === "string" ? raw : String(raw);
  const parsed = JSON.parse(text) as Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((r) => r.link)
    .map((r) => ({
      title: r.title ?? "Untitled",
      url: r.link as string,
      snippet: (r.snippet ?? "").slice(0, 2000),
    }));
}

function dedupeByUrl(items: WebSearchResultItem[]): WebSearchResultItem[] {
  const seen = new Set<string>();
  const out: WebSearchResultItem[] = [];
  for (const it of items) {
    const key = it.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length >= MAX_RESULTS_TOTAL) break;
  }
  return out;
}

/**
 * Runs web search for bureaucracy research. Prefers Tavily when TAVILY_API_KEY is set;
 * otherwise uses DuckDuckGo (no API key; may be rate-limited).
 */
export async function runWebResearch(queries: string[]): Promise<WebSearchOutput> {
  const trimmed = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(
    0,
    MAX_QUERIES,
  );
  if (!trimmed.length) {
    return { provider: "none", queries: [], results: [] };
  }

  if (process.env.AGENT_SKIP_WEB_SEARCH === "1") {
    return WebSearchOutputSchema.parse({
      provider: "none",
      queries: trimmed,
      results: [],
      warning: "Web search skipped (AGENT_SKIP_WEB_SEARCH=1).",
    });
  }

  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const collected: WebSearchResultItem[] = [];
  let warning: string | undefined;

  if (tavilyKey) {
    const batches = await Promise.all(
      trimmed.map((q) =>
        searchTavily(q, tavilyKey).catch((e) => {
          const msg =
            e instanceof Error ? e.message : "Tavily search failed for a query.";
          warning = warning ? `${warning}; ${msg}` : msg;
          return [] as WebSearchResultItem[];
        }),
      ),
    );
    for (const b of batches) collected.push(...b);
    const results = dedupeByUrl(collected);
    return WebSearchOutputSchema.parse({
      provider: "tavily",
      queries: trimmed,
      results,
      warning: results.length ? warning : warning ?? "No Tavily results returned.",
    });
  }

  const batches = await Promise.all(
    trimmed.map((q) =>
      searchDuckDuckGo(q).catch((e) => {
        const msg =
          e instanceof Error
            ? e.message
            : "DuckDuckGo search failed (network or rate limit).";
        warning = warning ? `${warning}; ${msg}` : msg;
        return [] as WebSearchResultItem[];
      }),
    ),
  );
  for (const b of batches) collected.push(...b);
  const results = dedupeByUrl(collected);
  return WebSearchOutputSchema.parse({
    provider: "duckduckgo",
    queries: trimmed,
    results,
    warning:
      results.length === 0
        ? warning ?? "No web results. Try again later or set TAVILY_API_KEY."
        : warning,
  });
}
