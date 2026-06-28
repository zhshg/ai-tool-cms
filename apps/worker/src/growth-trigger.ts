import { enqueueSiteGrowth } from "@ai-tool-cms/growth";
import { createLogger } from "@ai-tool-cms/logger";
import type { GrowthTriggerReason } from "@ai-tool-cms/growth";

const log = createLogger({ service: "growth-enqueue" });

/** Queue site growth after a tool is published (Sprint 5). */
export async function triggerSiteGrowthAfterPublish(
  toolId: string,
  reason: GrowthTriggerReason = "ai_pipeline_publish",
  actorId?: string,
): Promise<void> {
  try {
    const jobId = await enqueueSiteGrowth(toolId, reason, actorId);
    log.info("site growth job enqueued", { toolId, reason, jobId });
  } catch (error) {
    log.error("failed to enqueue site growth", { toolId, reason, error });
  }
}
