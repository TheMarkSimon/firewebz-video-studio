// Small retry helper for Gemini calls. The free tier load-sheds with 503/429
// when models are hot — first request often fails, second/third succeed.
// Use small budgets so user-perceived latency stays under ~25s in the worst case.

const TRANSIENT_PATTERNS = [
  /status:\s*503/i,
  /status:\s*429/i,
  /service unavailable/i,
  /unavailable/i,
  /rate limit/i,
  /resource[_\s]exhausted/i,
  /too many requests/i,
  /overloaded/i,
  /econnreset/i,
  /etimedout/i,
];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((p) => p.test(msg));
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 2000;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isTransient(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 2s, 4s, 8s
      const jitter = Math.floor(delay * 0.2 * Math.random());
      console.warn(`[gemini${opts.label ? ":" + opts.label : ""}] attempt ${attempt} failed (${(err as Error).message?.slice(0, 80)}), retrying in ${delay + jitter}ms`);
      await new Promise((r) => setTimeout(r, delay + jitter));
    }
  }
  throw lastErr;
}
