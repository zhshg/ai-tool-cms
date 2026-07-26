import { upsertBySlug } from "./helpers";
import { prisma } from "./context";

/**
 * Sprint 3 strategy: seed the mock source for framework validation
 * plus production-ready sources (TAAFT) for daily automated crawling.
 */
const FRAMEWORK_SOURCE = {
  slug: "mock",
  name: "Mock Source (Local Fixtures)",
  baseUrl: "https://mock.ai-tool-cms.local",
  adapterType: "mock",
  priority: 100,
} as const;

/** TAAFT 生产数据源 — 每日自动采集 theresanaiforthat.com */
const TAAFT_SOURCE = {
  slug: "taaft",
  name: "There's An AI For That",
  baseUrl: "https://theresanaiforthat.com",
  adapterType: "taaft",
  priority: 200,
} as const;

export async function seedCrawlSources(actorId: string): Promise<void> {
  // Mock 框架验证源（仅测试用）
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

  // TAAFT 生产源 — 每日自动采集
  await upsertBySlug(
    prisma.crawlSource,
    TAAFT_SOURCE.slug,
    {
      name: TAAFT_SOURCE.name,
      baseUrl: TAAFT_SOURCE.baseUrl,
      adapterType: TAAFT_SOURCE.adapterType,
      kind: "TOOLS",
      status: "ENABLED",
      schedule: "DAILY",
      crawlIntervalMinutes: 1440,
      priority: TAAFT_SOURCE.priority,
      isEnabled: true,
      createdById: actorId,
      metadata: {
        seeded: true,
        kind: "production",
        adapter: "TaaftAdapter",
        description: "There's An AI For That — daily automated crawling",
      },
    },
    {
      name: TAAFT_SOURCE.name,
      baseUrl: TAAFT_SOURCE.baseUrl,
      adapterType: TAAFT_SOURCE.adapterType,
      kind: "TOOLS",
      schedule: "DAILY",
      priority: TAAFT_SOURCE.priority,
      deletedAt: null,
      updatedById: actorId,
    },
  );
}
