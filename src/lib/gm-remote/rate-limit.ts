/** Rate limit in-memory (istanza serverless = per cold start). Chiave es. public_id sessione. */

const buckets = new Map<string, number[]>();

export function gmRemoteRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = buckets.get(key) ?? [];
  const filtered = arr.filter((t) => now - t < windowMs);
  if (filtered.length >= max) {
    buckets.set(key, filtered);
    return false;
  }
  filtered.push(now);
  buckets.set(key, filtered);
  return true;
}
