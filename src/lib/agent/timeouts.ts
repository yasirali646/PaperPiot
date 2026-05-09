/** Parse a positive milliseconds value from env, or use fallback. */
export function parseTimeoutMs(
  envValue: string | undefined,
  fallbackMs: number,
  /** Upper bound so env typos do not hang the process for days. */
  maxMs = 3_600_000,
): number {
  const cap = (n: number) => Math.min(n, maxMs);
  if (envValue == null || envValue === "") return cap(fallbackMs);
  const n = Number(envValue);
  if (!Number.isFinite(n) || n <= 0) return cap(fallbackMs);
  return cap(n);
}

/**
 * Rejects if `promise` does not settle within `ms`.
 * Use as a backstop when underlying clients have no timeout (e.g. some scrapers).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  }) as Promise<T>;
}
