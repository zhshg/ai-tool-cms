import { getEnv } from "@ai-tool-cms/config";
import { disconnectPrisma } from "@ai-tool-cms/database";
import { closeAllQueues } from "@ai-tool-cms/queue";
import { createLogger } from "@ai-tool-cms/logger";
import { startAllWorkers } from "./workers";

const log = createLogger({ service: "worker-main" });

async function main(): Promise<void> {
  getEnv();
  const workers = startAllWorkers();

  log.info("Crawler workers started", { queues: workers.length });

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
