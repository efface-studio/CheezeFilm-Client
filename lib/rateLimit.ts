/**
 * Tiny in-memory token-bucket rate limiter.
 *
 * Keyed by an arbitrary string (we use `ip:scope`). Lives in module scope so
 * it survives across requests within the same Node process — fine for a single
 * server instance. Behind a load balancer this would need Redis, but for a
 * single-host setup like ours it's exactly the right size of tool.
 *
 * Each bucket carries:
 *   - tokens: how many requests are still allowed in the current window
 *   - resetAt: when the window expires (ms epoch)
 *
 * A garbage collector sweeps expired buckets every ~10 minutes so the map
 * doesn't grow forever.
 */

type Bucket = { tokens: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastGc = Date.now();

function gc(now: number) {
  if (now - lastGc < 10 * 60_000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
  lastGc = now;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number; // seconds
};

/**
 * Try to consume one token from the bucket for `key`. Returns whether the
 * request is allowed plus diagnostics suitable for response headers.
 *
 * @param key  Stable identifier — e.g. "login:1.2.3.4" or "audition:1.2.3.4"
 * @param limit  Max requests allowed per window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  gc(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { tokens: limit - 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: fresh.tokens, resetAt: fresh.resetAt, retryAfter: 0 };
  }
  if (bucket.tokens <= 0) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.tokens -= 1;
  return {
    ok: true,
    remaining: bucket.tokens,
    resetAt: bucket.resetAt,
    retryAfter: 0,
  };
}

/**
 * Best-effort client IP from request headers. Behind Vercel/most proxies the
 * x-forwarded-for chain has the original IP first; fall back to a generic
 * bucket name if we can't read it (still rate-limits in aggregate).
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "anon";
}
