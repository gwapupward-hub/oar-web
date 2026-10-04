/**
 * Small per-instance TTL cache. Concurrent requests for one key share a single load, and failures are not cached.
 * It bounds RPC and fetch load from repeated views; it is not a substitute for platform rate limiting.
 */
export function ttlCache<V>(ttlMs: number, maxEntries: number, now: () => number = Date.now) {
  const entries = new Map<string, { at: number; value: Promise<V> }>();
  return function get(key: string, load: () => Promise<V>): Promise<V> {
    const hit = entries.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    if (hit) entries.delete(key);
    while (entries.size >= maxEntries) entries.delete(entries.keys().next().value as string);
    const value = load();
    entries.set(key, { at: now(), value });
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };
}
