import { slugify } from "@ai-tool-cms/common";
import type { CrawlExtractedItem } from "./Extractor";
import type { NormalizedToolDraft } from "./types";

export type NormalizeOptions = {
  sourceId: string;
  defaultWebsiteHost?: string;
};

export type Normalizer = {
  normalize(item: CrawlExtractedItem, options: NormalizeOptions): NormalizedToolDraft | null;
  normalizeMany(items: CrawlExtractedItem[], options: NormalizeOptions): NormalizedToolDraft[];
};

export class ToolDraftNormalizer implements Normalizer {
  normalize(item: CrawlExtractedItem, options: NormalizeOptions): NormalizedToolDraft | null {
    const name = item.name?.trim();
    const website = normalizeWebsite(item.website, options.defaultWebsiteHost);

    if (!name || !website) {
      return null;
    }

    return {
      name,
      website,
      description: item.description?.trim(),
      summary: item.summary?.trim(),
      logoUrl: item.logoUrl?.trim(),
      slug: slugify(name),
      externalId: item.externalId,
      tags: item.tags,
      categories: item.categories,
      sourceMeta: {
        sourceId: options.sourceId,
        raw: item.raw,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  normalizeMany(items: CrawlExtractedItem[], options: NormalizeOptions): NormalizedToolDraft[] {
    const drafts: NormalizedToolDraft[] = [];
    const seenWebsites = new Set<string>();

    for (const item of items) {
      const draft = this.normalize(item, options);
      if (!draft) continue;

      const key = canonicalWebsiteKey(draft.website);
      if (seenWebsites.has(key)) continue;
      seenWebsites.add(key);
      drafts.push(draft);
    }

    return drafts;
  }
}

export const defaultNormalizer = new ToolDraftNormalizer();

export function normalizeToolRecord(
  item: CrawlExtractedItem,
  options: NormalizeOptions,
): NormalizedToolDraft | null {
  return defaultNormalizer.normalize(item, options);
}

function normalizeWebsite(value: string | undefined, defaultHost?: string): string | undefined {
  if (!value?.trim()) {
    return defaultHost ? `https://${defaultHost}` : undefined;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

function canonicalWebsiteKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}
