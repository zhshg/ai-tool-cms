import type { CrawlRawPage } from "./Response";

/** Loosely-typed record extracted from a raw page before normalization. */
export type CrawlExtractedItem = {
  externalId?: string;
  name?: string;
  website?: string;
  description?: string;
  summary?: string;
  logoUrl?: string;
  tags?: string[];
  categories?: string[];
  raw?: Record<string, unknown>;
};

export type Extractor = {
  readonly name: string;
  supports(page: CrawlRawPage): boolean;
  extract(page: CrawlRawPage): CrawlExtractedItem[];
};

/** JSON list/API extractor — expects `{ items: [...] }` or array body. */
export class JsonListExtractor implements Extractor {
  readonly name = "json-list";

  supports(page: CrawlRawPage): boolean {
    const type = page.contentType ?? page.headers["content-type"] ?? "";
    return type.includes("application/json") || page.body.trim().startsWith("[");
  }

  extract(page: CrawlRawPage): CrawlExtractedItem[] {
    const parsed = JSON.parse(page.body) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.items)
        ? parsed.items
        : isRecord(parsed) && Array.isArray(parsed.data)
          ? parsed.data
          : [];

    return items.filter(isRecord).map((item) => ({
      externalId: stringField(item, ["id", "externalId", "slug"]),
      name: stringField(item, ["name", "title"]),
      website: stringField(item, ["website", "url", "link", "homepage"]),
      description: stringField(item, ["description", "summary", "excerpt"]),
      summary: stringField(item, ["summary", "tagline"]),
      logoUrl: stringField(item, ["logo", "logoUrl", "image", "icon"]),
      tags: arrayField(item, ["tags", "labels"]),
      categories: arrayField(item, ["categories", "category"]),
      raw: item,
    }));
  }
}

/** Pass-through extractor for adapters that already return structured items in metadata. */
export class PassthroughExtractor implements Extractor {
  readonly name = "passthrough";

  supports(): boolean {
    return true;
  }

  extract(page: CrawlRawPage): CrawlExtractedItem[] {
    const items = page.cursor?.metadata?.extracted;
    if (!Array.isArray(items)) {
      return [];
    }
    return items.filter(isRecord) as CrawlExtractedItem[];
  }
}

export class ExtractorRegistry {
  private readonly extractors: Extractor[] = [];

  register(extractor: Extractor): this {
    this.extractors.push(extractor);
    return this;
  }

  extract(page: CrawlRawPage): CrawlExtractedItem[] {
    for (const extractor of this.extractors) {
      if (extractor.supports(page)) {
        return extractor.extract(page);
      }
    }
    return [];
  }
}

export const defaultExtractorRegistry = new ExtractorRegistry()
  .register(new JsonListExtractor())
  .register(new PassthroughExtractor());

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function arrayField(record: Record<string, unknown>, keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }
  return undefined;
}
