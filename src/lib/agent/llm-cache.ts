import "server-only";

import { InMemoryCache } from "@langchain/core/caches";

/**
 * Process-wide LLM generation cache. LangChain JS (this project: @langchain/core 1.1.x)
 * does not ship `@langchain/core/globals` or `setCache()` like some docs/snippets suggest.
 * `InMemoryCache.global()` is the supported singleton — the same map used when you pass
 * `cache: true` to a chat model.
 */
export const globalLlmCache = InMemoryCache.global();
