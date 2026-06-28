import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { prisma } from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import { snapshotToolPopularity } from "@ai-tool-cms/ranking";
import { indexTool } from "@ai-tool-cms/search";
import {
  createRedisConnection,
  SEARCH_QUEUE_NAMES,
  type SearchIndexJobPayload,
} from "@ai-tool-cms/queue";

const log = createLogger({ service: "search-index-worker" });
const workerConnection = () => createRedisConnection() as never;

/** Commit 052 — auto index to Meilisearch after tool publish/AI/SEO (no manual reindex). */
export function startSearchIndexWorker(): Worker<SearchIndexJobPayload> {
  return new Worker<SearchIndexJobPayload>(
    SEARCH_QUEUE_NAMES.TOOL_INDEX,
    async (job: Job<SearchIndexJobPayload>) => {
      const { toolId, reason } = job.data;
      log.info("search index job started", { toolId, reason, jobId: job.id });

      const indexResult = await indexTool(prisma, toolId, { toolId, reason });
      await snapshotToolPopularity(prisma, toolId);

      log.info("search index job finished", { toolId, ...indexResult });
    },
    { connection: workerConnection(), concurrency: 4 },
  );
}
