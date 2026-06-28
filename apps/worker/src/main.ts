import { getEnv } from "@ai-tool-cms/config";
import { disconnectPrisma } from "@ai-tool-cms/database";
import { closeAllQueues } from "@ai-tool-cms/queue";
import { createLogger } from "@ai-tool-cms/logger";
import { startAiPipelineWorkers } from "./ai-pipeline";
import { startGrowthWorker } from "./growth-worker";
import { startSearchIndexWorker } from "./search-index-worker";
import { startPlatformWorkers } from "./platform-worker";
import { startAllWorkers } from "./workers";

const log = createLogger({ service: "worker-main" });

async function main(): Promise<void> {
  getEnv();
  const crawlWorkers = startAllWorkers();
  const aiWorkers = startAiPipelineWorkers();
  const growthWorkers = [startGrowthWorker()];
  const searchWorkers = [startSearchIndexWorker()];
  const platformWorkers = startPlatformWorkers();
  const workers = [
    ...crawlWorkers,
    ...aiWorkers,
    ...growthWorkers,
    ...searchWorkers,
    ...platformWorkers,
  ];

  log.info("Workers started", {
    crawlQueues: crawlWorkers.length,
    aiQueues: aiWorkers.length,
    growthQueues: growthWorkers.length,
    searchQueues: searchWorkers.length,
    platformQueues: platformWorkers.length,
  });

  const shutdown = async (signal: string) => {
    log.info("Shutting down workers", { signal });
    await Promise.all(workers.map((worker) => worker.close()));
    await closeAllQueues();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  log.error("Worker failed to start", { error });
  process.exit(1);
});
