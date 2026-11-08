type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
  store: Map<string, Bucket> = buckets,
): RateLimitResult {
  const bucket = store.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;
  const timestamps = bucket.timestamps.filter((stamp) => stamp > cutoff);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now;
    store.set(key, { timestamps });
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  timestamps.push(now);
  store.set(key, { timestamps });
  return {
    ok: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterMs: 0,
  };
}

export function resetRateLimitStore(store: Map<string, Bucket> = buckets) {
  store.clear();
}
