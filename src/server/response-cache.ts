import "server-only";

/**
 * A small LRU cache with a time-to-live, for ideas keyed by brief + model + prompt version
 * (plan/04 §4.4). A Map keeps insertion order, so re-inserting on read marks an entry as recent.
 */
export class LruCache<Value> {
  private readonly entries = new Map<string, { value: Value; expiresAt: number }>();

  constructor(
    private readonly maxEntries = 200,
    private readonly ttlMs = 3_600_000,
  ) {}

  get(key: string, now: number): Value | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    if (entry.expiresAt <= now) return undefined;
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: Value, now: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}
