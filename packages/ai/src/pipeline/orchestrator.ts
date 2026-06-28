import { randomUUID } from "node:crypto";
import {
  AI_PIPELINE_STAGES,
  AI_QUEUE_NAMES,
  nextStage,
  queueForStage,
  type AiPipelineJobPayload,
  type AiPipelineStageId,
} from "./types";

export type EnqueueFn = (
  queueName: string,
  jobName: string,
  payload: AiPipelineJobPayload,
) => Promise<string>;

export function createPipelineRunId(): string {
  return randomUUID();
}

/** Commit 040 — enqueue first AI stage after crawler normalize */
export async function startAiPipeline(
  toolId: string,
  enqueue: EnqueueFn,
  actorId?: string,
): Promise<{ pipelineRunId: string; jobId: string }> {
  const pipelineRunId = createPipelineRunId();
  const payload: AiPipelineJobPayload = { toolId, pipelineRunId, actorId };
  const jobId = await enqueue(AI_QUEUE_NAMES.AI_SUMMARY, "summary", payload);
  return { pipelineRunId, jobId };
}

export async function enqueueNextStage(
  currentStage: AiPipelineStageId,
  payload: AiPipelineJobPayload,
  enqueue: EnqueueFn,
): Promise<string | null> {
  const next = nextStage(currentStage);
  if (!next) return null;
  return enqueue(queueForStage(next), next.toLowerCase(), payload);
}

export function fullPipelineOrder(): AiPipelineStageId[] {
  return [...AI_PIPELINE_STAGES];
}
