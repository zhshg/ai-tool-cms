import type { ToolSummary } from "./tool";

export interface SearchHighlight {
  field: string;
  snippet: string;
}

export interface SearchHit<T> {
  document: T;
  score?: number;
  highlights?: SearchHighlight[];
}

export interface SearchResult<T = ToolSummary> {
  query: string;
  hits: SearchHit<T>[];
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  processingTimeMs: number;
}
