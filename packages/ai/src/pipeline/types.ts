export type AiPipelineStageId =
  "SUMMARY" | "FEATURE" | "FAQ" | "SEO" | "GEO" | "QUALITY" | "PUBLISH";

export const AI_PIPELINE_STAGES: AiPipelineStageId[] = [
  "SUMMARY",
  "FEATURE",
  "FAQ",
  "SEO",
  "GEO",
  "QUALITY",
  "PUBLISH",
];

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

export function queueForStage(stage: AiPipelineStageId): AiQueueName {
  switch (stage) {
    case "SUMMARY":
      return AI_QUEUE_NAMES.AI_SUMMARY;
    case "FEATURE":
      return AI_QUEUE_NAMES.AI_FEATURE;
    case "FAQ":
      return AI_QUEUE_NAMES.AI_FAQ;
    case "SEO":
      return AI_QUEUE_NAMES.AI_SEO;
    case "GEO":
      return AI_QUEUE_NAMES.AI_GEO;
    case "QUALITY":
      return AI_QUEUE_NAMES.AI_QUALITY;
    case "PUBLISH":
      return AI_QUEUE_NAMES.AI_PUBLISH;
    default:
      return AI_QUEUE_NAMES.AI_SUMMARY;
  }
}

export function nextStage(stage: AiPipelineStageId): AiPipelineStageId | null {
  const index = AI_PIPELINE_STAGES.indexOf(stage);
  if (index < 0 || index >= AI_PIPELINE_STAGES.length - 1) return null;
  return AI_PIPELINE_STAGES[index + 1] ?? null;
}
