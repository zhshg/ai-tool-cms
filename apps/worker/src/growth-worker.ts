import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { prisma } from "@ai-tool-cms/database";
import { runSiteGrowthLoop } from "@ai-tool-cms/growth";
import { createLogger } from "@ai-tool-cms/logger";
import {
  createRedisConnection,
  GROWTH_QUEUE_NAMES,
  type GrowthJobPayload,
} from "@ai-tool-cms/queue";

const log = createLogger({ service: "growth-worker" });
const workerConnection = () => createRedisConnection() as never;

export function startGrowthWorker(): Worker<GrowthJobPayload> {
  return new Worker<GrowthJobPayload>(
    GROWTH_QUEUE_NAMES.TOOL_PUBLISHED,
    async (job: Job<GrowthJobPayload>) => {
      const { toolId, reason, actorId } = job.data;
      log.info("site growth loop started", { toolId, reason, jobId: job.id });

      const result = await runSiteGrowthLoop(prisma, toolId, reason, actorId);

      log.info("site growth loop finished", {
        toolId,
        reason,
        steps: Object.keys(result.steps),
      });
    },
    { connection: workerConnection(), concurrency: 3 },
  );
}
