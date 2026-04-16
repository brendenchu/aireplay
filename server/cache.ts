interface CacheEntry<T> {
  data: T;
  mtime: number;
  cachedAt: number;
}

export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  set<T>(key: string, data: T, mtime: number): void {
    this.store.set(key, { data, mtime, cachedAt: Date.now() });
  }

  isStale(key: string, currentMtime: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    return currentMtime > entry.mtime;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new Cache();
