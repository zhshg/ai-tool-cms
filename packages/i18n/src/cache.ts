const cache = new Map<string, { value: string; expiresAt: number }>();
const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function translationCacheKey(
  entity: string,
  id: string,
  locale: string,
  field: string,
): string {
  return `${entity}:${id}:${locale}:${field}`;
}

export function getCachedTranslation(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedTranslation(key: string, value: string, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearTranslationCache(prefix?: string): number {
  if (!prefix) {
    const size = cache.size;
    cache.clear();
    return size;
  }
  let cleared = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      cleared += 1;
    }
  }
  return cleared;
}
