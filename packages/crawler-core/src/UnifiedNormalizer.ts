import { slugify } from "@ai-tool-cms/common";
import type { CrawlToolDetailDTO } from "./ToolDTO";
import type { ToolDTO } from "./ToolDTO";

export type UnifiedNormalizeInput = {
  sourceId: string;
  detail: CrawlToolDetailDTO;
  sourceUrl?: string;
};

export class UnifiedToolNormalizer {
  normalize(input: UnifiedNormalizeInput): ToolDTO | null {
    const name = input.detail.name?.trim();
    const website = normalizeWebsite(input.detail.website ?? input.detail.url);

    if (!name || !website) {
      return null;
    }

    const domain = extractDomain(website);

    return {
      name,
      slug: slugify(input.detail.slug ?? name),
      website,
      domain,
      description: input.detail.description?.trim(),
      summary: input.detail.summary?.trim(),
      logoUrl: input.detail.logoUrl?.trim(),
      categories: input.detail.categoryExternalIds ?? [],
      tags: input.detail.tags ?? [],
      features: input.detail.features ?? [],
      platforms: input.detail.platforms ?? [],
      pricingModel: input.detail.pricingModel,
      externalId: input.detail.externalId,
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      metadata: {
        raw: input.detail.raw,
        normalizedAt: new Date().toISOString(),
      },
    };
  }

  normalizeMany(items: UnifiedNormalizeInput[]): ToolDTO[] {
    const results: ToolDTO[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      const dto = this.normalize(item);
      if (!dto) continue;
      const key = `${dto.domain}::${dto.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(dto);
    }

    return results;
  }
}

export const unifiedToolNormalizer = new UnifiedToolNormalizer();

export function normalizeToToolDTO(input: UnifiedNormalizeInput): ToolDTO | null {
  return unifiedToolNormalizer.normalize(input);
}

function normalizeWebsite(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return url.toLowerCase();
  }
}
