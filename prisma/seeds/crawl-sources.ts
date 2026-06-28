import { upsertBySlug } from "./helpers";
import { prisma } from "./context";

/**
 * Sprint 3 strategy: seed only the mock source for framework validation.
 * Real sources (Toolify, Futurepedia, …) are added later via registerProductionSiteAdapters().
 */
const FRAMEWORK_SOURCE = {
  slug: "mock",
  name: "Mock Source (Local Fixtures)",
  baseUrl: "https://mock.ai-tool-cms.local",
  adapterType: "mock",
  priority: 100,
} as const;

export async function seedCrawlSources(actorId: string): Promise<void> {
  await upsertBySlug(
    prisma.crawlSource,
    FRAMEWORK_SOURCE.slug,
    {
      name: FRAMEWORK_SOURCE.name,
      baseUrl: FRAMEWORK_SOURCE.baseUrl,
      adapterType: FRAMEWORK_SOURCE.adapterType,
      status: "ENABLED",
      schedule: "MANUAL",
      crawlIntervalMinutes: 1440,
      priority: FRAMEWORK_SOURCE.priority,
      isEnabled: true,
      createdById: actorId,
      metadata: { seeded: true, kind: "framework-mock" },
    },
    {
      name: FRAMEWORK_SOURCE.name,
      baseUrl: FRAMEWORK_SOURCE.baseUrl,
      adapterType: FRAMEWORK_SOURCE.adapterType,
      schedule: "MANUAL",
      priority: FRAMEWORK_SOURCE.priority,
      deletedAt: null,
      updatedById: actorId,
    },
  );
}
