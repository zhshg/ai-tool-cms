import { GROWTH_QUEUE_NAMES, enqueueGrowthJob } from "@ai-tool-cms/queue";
import type { GrowthTriggerReason } from "./types";

/** Enqueue site growth loop — decoupled from AI PUBLISH worker for resilience. */
export async function enqueueSiteGrowth(
  toolId: string,
  reason: GrowthTriggerReason,
  actorId?: string,
): Promise<string> {
  return enqueueGrowthJob(GROWTH_QUEUE_NAMES.TOOL_PUBLISHED, "tool-published", {
    toolId,
    reason,
    actorId,
  });
}
