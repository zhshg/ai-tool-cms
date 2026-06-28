import { prisma } from "@ai-tool-cms/database";
import { createLogger } from "@ai-tool-cms/logger";
import { pingSitemapsAfterPublish, syncComparePages, syncInternalLinks } from "@ai-tool-cms/seo";

const log = createLogger({ service: "seo-sync" });

/** Run SEO sync after a tool is published (Commits 043–046). */
export async function runSeoSyncAfterPublish(toolId: string): Promise<void> {
  try {
    const [links, compare, ping] = await Promise.all([
      syncInternalLinks(prisma, toolId),
      syncComparePages(prisma),
      pingSitemapsAfterPublish(),
    ]);

    log.info("SEO sync completed after publish", {
      toolId,
      internalLinks: links,
      comparePages: compare,
      ping,
    });
  } catch (error) {
    log.error("SEO sync failed after publish", { toolId, error });
  }
}
