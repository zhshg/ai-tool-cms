import type { PricingModel, ToolStatus } from "@ai-tool-cms/database";

export type AutoUpdateMode = "manual-review" | "safe-auto" | "full-auto";

export type SourceId =
  | "producthunt"
  | "taaft"
  | "futurepedia"
  | "github-trending"
  | "huggingface-spaces"
  | "hackernews"
  | "reddit-ai";

export type CandidateStatus =
  | "create"
  | "draft"
  | "update-empty"
  | "skip";

export type CandidateDraft = {
  sourceId: SourceId;
  sourceName: string;
  sourceUrl: string;
  externalId?: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  pricingType: PricingModel;
  slug: string;
  confidenceScore: number;
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  discoveredAt: string;
  metadata: Record<string, unknown>;
};

export type ExistingToolLite = {
  id: string;
  slug: string;
  name: string;
  website: string;
  logoUrl: string | null;
  summary: string | null;
  description: string | null;
  status: ToolStatus;
  metadata: Record<string, unknown>;
  categorySlugs: string[];
  tagNames: string[];
};

export type CandidateDecision = {
  candidate: CandidateDraft;
  status: CandidateStatus;
  publish: boolean;
  matchedToolId: string | null;
  matchedToolSlug: string | null;
  updateFields: string[];
  reasons: string[];
};

export type SourceRunResult = {
  sourceId: SourceId;
  sourceName: string;
  enabled: boolean;
  requestedLimit: number;
  fetchedCount: number;
  candidates: CandidateDraft[];
  errors: string[];
};

export type AutoUpdateOptions = {
  mode: AutoUpdateMode;
  limit: number;
  dryRun: boolean;
  apply: boolean;
  report: boolean;
  date: string;
  sourceIds: SourceId[];
  autoApplyEnabled: boolean;
  autoUpdateEnabled: boolean;
  dailyLimit: number;
  minConfidence: number;
};

export type AutoUpdateSummary = {
  totalFetched: number;
  candidateCount: number;
  duplicateCount: number;
  createCount: number;
  draftCount: number;
  updateEmptyCount: number;
  skipCount: number;
  publishedCount: number;
  lowConfidenceCount: number;
  warningCount: number;
};

export type PersistedCandidateSnapshot = {
  generatedAt: string;
  date: string;
  mode: AutoUpdateMode;
  options: Pick<AutoUpdateOptions, "limit" | "dryRun" | "apply" | "sourceIds">;
  sources: SourceRunResult[];
  decisions: CandidateDecision[];
  summary: AutoUpdateSummary;
};
