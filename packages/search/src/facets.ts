import type { SearchFacets, SearchToolDocument } from "./types";

type FacetBucket = Map<string, number>;

function countField(values: string[], bucket: FacetBucket): void {
  for (const value of values) {
    if (!value) continue;
    bucket.set(value, (bucket.get(value) ?? 0) + 1);
  }
}

function toFacetValues(bucket: FacetBucket, limit = 12) {
  return [...bucket.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

/** Build facet counts from a result set (Commit 051). */
export function buildFacetsFromDocuments(documents: SearchToolDocument[]): SearchFacets {
  const categories = new Map<string, number>();
  const tags = new Map<string, number>();
  const pricing = new Map<string, number>();
  const platforms = new Map<string, number>();
  const languages = new Map<string, number>();

  for (const doc of documents) {
    countField(doc.categorySlugs, categories);
    countField(doc.tagSlugs, tags);
    if (doc.pricingModel) pricing.set(doc.pricingModel, (pricing.get(doc.pricingModel) ?? 0) + 1);
    countField(doc.platforms, platforms);
    countField(doc.languages, languages);
  }

  return {
    categories: toFacetValues(categories),
    tags: toFacetValues(tags),
    pricing: toFacetValues(pricing),
    platforms: toFacetValues(platforms),
    languages: toFacetValues(languages),
  };
}
