import type { SearchHit, SearchSortField, SearchToolDocument } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rerankWithEmbeddings(
  hits: SearchHit[],
  queryEmbedding: number[],
  embeddings: Map<string, number[]>,
  blend = 0.55,
): SearchHit[] {
  return hits
    .map((hit) => {
      const vector = embeddings.get(hit.document.id);
      const semanticScore = vector ? cosineSimilarity(queryEmbedding, vector) : 0;
      const keywordScore = hit.score;
      const combined = keywordScore * (1 - blend) + semanticScore * 100 * blend;
      return { ...hit, semanticScore, score: combined };
    })
    .sort((a, b) => b.score - a.score);
}

export function sortHits(hits: SearchHit[], sort: SearchSortField = "relevance"): SearchHit[] {
  const copy = [...hits];
  switch (sort) {
    case "popularity":
      return copy.sort(
        (a, b) => (b.document.popularityScore ?? 0) - (a.document.popularityScore ?? 0),
      );
    case "newest":
      return copy.sort((a, b) => {
        const aDate = a.document.publishedAt ?? a.document.updatedAt;
        const bDate = b.document.publishedAt ?? b.document.updatedAt;
        return bDate.localeCompare(aDate);
      });
    case "rating":
      return copy.sort((a, b) => (b.document.reviewScore ?? 0) - (a.document.reviewScore ?? 0));
    case "relevance":
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}

export function buildSearchableText(
  doc: Pick<
    SearchToolDocument,
    "name" | "summary" | "description" | "categoryNames" | "tagNames" | "features" | "useCases"
  >,
): string {
  return [
    doc.name,
    doc.summary,
    doc.description,
    ...doc.categoryNames,
    ...doc.tagNames,
    ...doc.features,
    ...doc.useCases,
  ]
    .filter(Boolean)
    .join(" ");
}
