export class WikiLruCache<T> {
  private readonly store = new Map<string, T>();

  constructor(private readonly maxEntries = 80) {}

  get(key: string): T | undefined {
    if (!this.store.has(key)) return undefined;
    const val = this.store.get(key)!;
    // Refresh recency
    this.store.delete(key);
    this.store.set(key, val);
    return val;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, value);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/**
 * Parses numeric HP or AC from free-form D&D stat strings like "110 (13d10 + 39)" or "16 (armatura naturale)".
 */
export function parseMonsterStatInteger(raw: string | null | undefined, fallback: number): number {
  if (!raw) return fallback;
  const match = raw.match(/\d+/);
  if (!match) return fallback;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
