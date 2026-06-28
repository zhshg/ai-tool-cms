import { Injectable } from "@nestjs/common";
import { enqueueSiteGrowth } from "@ai-tool-cms/growth";
import type { GrowthTriggerReason } from "@ai-tool-cms/growth";

@Injectable()
export class GrowthService {
  async enqueueToolPublished(
    toolId: string,
    reason: GrowthTriggerReason,
    actorId?: string,
  ): Promise<{ jobId: string }> {
    const jobId = await enqueueSiteGrowth(toolId, reason, actorId);
    return { jobId };
  }
}
