import type { GeoOutput } from "@ai-tool-cms/ai";

export type GeoContentBlock = {
  type: "llm_summary" | "ai_facts" | "question_cluster" | "knowledge_card" | "entity" | "citation";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type StructuredEntity = {
  id: string;
  name: string;
  entityType: string;
  category?: string;
  relations?: Array<{ rel: string; target: string }>;
};

export type AiCitation = {
  text: string;
  sourceUrl?: string;
  confidence?: string;
};

export type GeoPageDocument = {
  toolSlug: string;
  toolName: string;
  llmSummary: string;
  aiAnswer: string;
  facts: Array<{ fact: string; confidence?: string }>;
  questionClusters: string[][];
  knowledgeCards: Array<{ title: string; content: string }>;
  entities: StructuredEntity[];
  citations: AiCitation[];
  semanticParagraphs: string[];
  targets: Array<"chatgpt" | "gemini" | "claude" | "perplexity">;
};

export type GeoToolInput = {
  slug: string;
  name: string;
  website: string;
  description?: string | null;
  category?: string | null;
  geo?: GeoOutput | Record<string, unknown> | null;
};
