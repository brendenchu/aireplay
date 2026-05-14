export class Cache {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | null {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, data);
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new Cache();
