import type { CrawlRawPage } from "./Response";

export type StorageKey = {
  sourceId: string;
  url: string;
  fetchedAt?: string;
};

export type CrawlStorage = {
  get(key: StorageKey): Promise<CrawlRawPage | null>;
  put(page: CrawlRawPage): Promise<void>;
  delete(key: StorageKey): Promise<void>;
};

/** In-memory storage for tests and local development. */
export class MemoryCrawlStorage implements CrawlStorage {
  private readonly store = new Map<string, CrawlRawPage>();

  async get(key: StorageKey): Promise<CrawlRawPage | null> {
    return this.store.get(this.serialize(key)) ?? null;
  }

  async put(page: CrawlRawPage): Promise<void> {
    this.store.set(
      this.serialize({ sourceId: page.sourceId, url: page.url, fetchedAt: page.fetchedAt }),
      page,
    );
  }

  async delete(key: StorageKey): Promise<void> {
    this.store.delete(this.serialize(key));
  }

  private serialize(key: StorageKey): string {
    return `${key.sourceId}::${key.url}`;
  }
}

export class NoopCrawlStorage implements CrawlStorage {
  async get(): Promise<CrawlRawPage | null> {
    return null;
  }

  async put(): Promise<void> {}

  async delete(): Promise<void> {}
}
