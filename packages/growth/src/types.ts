export type GrowthTriggerReason =
  "ai_pipeline_publish" | "manual_publish" | "cms_publish" | "seed_backfill";

export type GrowthJobPayload = {
  toolId: string;
  reason: GrowthTriggerReason;
  actorId?: string;
};

export type GrowthLoopStepResult = Record<string, unknown>;

export type GrowthLoopResult = {
  toolId: string;
  reason: GrowthTriggerReason;
  steps: GrowthLoopStepResult;
  finishedAt: string;
};
