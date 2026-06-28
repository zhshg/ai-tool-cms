export type {
  IndexToolPayload,
  SearchFacetValue,
  SearchFacets,
  SearchFilters,
  SearchHit,
  SearchQuery,
  SearchResult,
  SearchSortField,
  SearchToolDocument,
} from "./types";

export { SearchService, createSearchService } from "./search-service";
export { Indexer, indexTool } from "./indexer";
export { enqueueSearchIndex } from "./enqueue";
export {
  TOOLS_INDEX,
  deleteToolDocument,
  ensureToolsIndex,
  getMeiliClient,
  isMeiliConfigured,
  upsertToolDocument,
} from "./client";
export { expandQuerySynonyms, getSynonymTerms } from "./synonyms";
export { buildMeiliFilter, normalizeFilters } from "./filters";
export { buildFacetsFromDocuments } from "./facets";
export { cosineSimilarity, rerankWithEmbeddings, sortHits, buildSearchableText } from "./ranking";
export {
  embedText,
  getEmbeddingProvider,
  resolveEmbeddingProvider,
  type EmbeddingProviderId,
} from "./embeddings";
