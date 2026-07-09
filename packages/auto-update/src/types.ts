import type { PricingModel, ToolStatus } from "@ai-tool-cms/database";

export type AutoUpdateMode = "manual-review" | "safe-auto" | "full-auto";

export type SourceId =
  | "aitoolsdirectory"
  | "producthunt"
  | "taaft"
  | "theresanaiforthat"
  | "futurepedia"
  | "github-trending"
  | "huggingface-spaces"
  | "hackernews"
  | "reddit-ai";

export type CandidateStatus = "create" | "draft" | "update-empty" | "skip";

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
  metaTitle?: string | null;
  metaDescription?: string | null;
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

export type ExistingCategoryLite = {
  id: string;
  slug: string;
  name: string;
};

export type CrawlerImportOptions = {
  updateExisting: boolean;
  categoryFallbackSlug: string | null;
  defaultStatus: ToolStatus;
  skipLogo: boolean;
};

export type PlannedCrawlerTool = {
  sourceId: SourceId;
  sourceName: string;
  sourceUrl: string;
  externalId?: string;
  name: string;
  slug: string;
  website: string;
  rootDomain: string;
  summary: string;
  description: string;
  logoUrl: string | null;
  pricingModel: PricingModel;
  status: ToolStatus;
  metaTitle: string;
  metaDescription: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  tags: string[];
  metadata: Record<string, unknown>;
};

export type CrawlerPlanDecision = {
  candidate: CandidateDraft;
  action: "create" | "update" | "skip";
  matchedToolId: string | null;
  matchedToolSlug: string | null;
  normalized: PlannedCrawlerTool;
  updateFields: string[];
  duplicateReasons: string[];
  validationErrors: string[];
  warnings: string[];
  suspectedFakeUrl: boolean;
};

export type CrawlerPlanSummary = {
  totalFetched: number;
  planCreateCount: number;
  planUpdateCount: number;
  skipCount: number;
  duplicateCount: number;
  fallbackCategoryCount: number;
  missingFieldCount: number;
  suspectedFakeUrlCount: number;
  sampleCount: number;
};

export type CrawlerPlanResult = {
  decisions: CrawlerPlanDecision[];
  summary: CrawlerPlanSummary;
};
