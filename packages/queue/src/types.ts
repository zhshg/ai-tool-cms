export const CRAWL_QUEUE_NAMES = {
  CRAWL_TOOL: "crawl-tool",
  CRAWL_CATEGORY: "crawl-category",
  CRAWL_DETAIL: "crawl-detail",
  CRAWL_IMAGE: "crawl-image",
  NORMALIZE: "normalize",
} as const;

export type CrawlQueueName = (typeof CRAWL_QUEUE_NAMES)[keyof typeof CRAWL_QUEUE_NAMES];

export type CrawlQueueJobType =
  "CRAWL_TOOL" | "CRAWL_CATEGORY" | "CRAWL_DETAIL" | "CRAWL_IMAGE" | "NORMALIZE";

export type CrawlToolJobPayload = {
  sourceId: string;
  crawlJobId: string;
  actorId?: string;
};

export type CrawlCategoryJobPayload = {
  sourceId: string;
  crawlJobId: string;
};

export type CrawlDetailJobPayload = {
  sourceId: string;
  crawlJobId: string;
  externalId: string;
  item: Record<string, unknown>;
};

export type CrawlImageJobPayload = {
  sourceId: string;
  crawlJobId: string;
  logoUrl?: string;
  toolPayload: Record<string, unknown>;
};

export type NormalizeJobPayload = {
  sourceId: string;
  crawlJobId: string;
  detail: Record<string, unknown>;
};

export type CrawlQueuePayloadMap = {
  [CRAWL_QUEUE_NAMES.CRAWL_TOOL]: CrawlToolJobPayload;
  [CRAWL_QUEUE_NAMES.CRAWL_CATEGORY]: CrawlCategoryJobPayload;
  [CRAWL_QUEUE_NAMES.CRAWL_DETAIL]: CrawlDetailJobPayload;
  [CRAWL_QUEUE_NAMES.CRAWL_IMAGE]: CrawlImageJobPayload;
  [CRAWL_QUEUE_NAMES.NORMALIZE]: NormalizeJobPayload;
};

export const AI_QUEUE_NAMES = {
  AI_SUMMARY: "ai-summary",
  AI_FEATURE: "ai-feature",
  AI_FAQ: "ai-faq",
  AI_SEO: "ai-seo",
  AI_GEO: "ai-geo",
  AI_QUALITY: "ai-quality",
  AI_PUBLISH: "ai-publish",
} as const;

export type AiQueueName = (typeof AI_QUEUE_NAMES)[keyof typeof AI_QUEUE_NAMES];

export type AiPipelineJobPayload = {
  toolId: string;
  pipelineRunId: string;
  actorId?: string;
  attempt?: number;
};

export type AiQueuePayloadMap = {
  [AI_QUEUE_NAMES.AI_SUMMARY]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_FEATURE]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_FAQ]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_SEO]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_GEO]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_QUALITY]: AiPipelineJobPayload;
  [AI_QUEUE_NAMES.AI_PUBLISH]: AiPipelineJobPayload;
};

export function queueNameForJobType(jobType: CrawlQueueJobType): CrawlQueueName {
  switch (jobType) {
    case "CRAWL_CATEGORY":
      return CRAWL_QUEUE_NAMES.CRAWL_CATEGORY;
    case "CRAWL_DETAIL":
      return CRAWL_QUEUE_NAMES.CRAWL_DETAIL;
    case "CRAWL_IMAGE":
      return CRAWL_QUEUE_NAMES.CRAWL_IMAGE;
    case "NORMALIZE":
      return CRAWL_QUEUE_NAMES.NORMALIZE;
    case "CRAWL_TOOL":
    default:
      return CRAWL_QUEUE_NAMES.CRAWL_TOOL;
  }
}
