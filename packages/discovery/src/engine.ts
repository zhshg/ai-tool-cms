import type { Prisma, PrismaClient } from "@ai-tool-cms/database";
import type { DiscoverySourceKind } from "@ai-tool-cms/database";
import {
  githubTrendingAdapter,
  googleNewsAdapter,
  hackerNewsAdapter,
  huggingFaceAdapter,
  officialBlogAdapter,
  productHuntAdapter,
  redditAiAdapter,
  rssFeedAdapter,
  xAiAdapter,
} from "./adapters";
import type { DiscoveryAdapter, DiscoveryCandidate } from "./types";
import { DEFAULT_DISCOVERY_SOURCES } from "./types";

const adapters: DiscoveryAdapter[] = [
  hackerNewsAdapter,
  githubTrendingAdapter,
  redditAiAdapter,
  huggingFaceAdapter,
  productHuntAdapter,
  googleNewsAdapter,
  rssFeedAdapter,
  officialBlogAdapter,
  xAiAdapter,
];

function adapterFor(kind: DiscoverySourceKind): DiscoveryAdapter | undefined {
  return adapters.find((a) => a.kind === kind);
}

export async function ensureDefaultDiscoverySources(prisma: PrismaClient): Promise<number> {
  let created = 0;
  for (const source of DEFAULT_DISCOVERY_SOURCES) {
    const existing = await prisma.discoverySource.findFirst({
      where: { slug: source.slug, deletedAt: null },
    });
    if (existing) continue;
    await prisma.discoverySource.create({
      data: {
        slug: source.slug,
        name: source.name,
        kind: source.kind,
        url: source.url,
        intervalHours: source.intervalHours,
        priority: source.priority,
        nextRunAt: new Date(),
      },
    });
    created += 1;
  }
  return created;
}

export async function runDiscoveryTask(
  prisma: PrismaClient,
  taskId: string,
): Promise<{ itemsFound: number; candidates: DiscoveryCandidate[] }> {
  const task = await prisma.discoveryTask.findUnique({
    where: { id: taskId },
    include: { source: true },
  });
  if (!task?.source) {
    throw new Error(`Discovery task not found: ${taskId}`);
  }

  await prisma.discoveryTask.update({
    where: { id: taskId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const adapter = adapterFor(task.source.kind);
  if (!adapter) {
    throw new Error(`No adapter for kind: ${task.source.kind}`);
  }

  try {
    const config = (task.source.config ?? {}) as Record<string, unknown>;
    const candidates = await adapter.discover({
      sourceUrl: task.source.url,
      config,
    });

    const existingUrls = new Set(
      (
        await prisma.discoveryResult.findMany({
          where: { url: { in: candidates.map((c) => c.url) } },
          select: { url: true },
          take: 500,
        })
      ).map((r) => r.url),
    );

    let inserted = 0;
    for (const candidate of candidates) {
      const status = existingUrls.has(candidate.url) ? "DUPLICATE" : "NEW";
      await prisma.discoveryResult.create({
        data: {
          taskId,
          sourceKind: task.source.kind,
          externalId: candidate.externalId,
          title: candidate.title.slice(0, 500),
          url: candidate.url.slice(0, 2048),
          description: candidate.description,
          relevanceScore: candidate.relevanceScore,
          status,
          metadata: (candidate.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
      if (status === "NEW") inserted += 1;
    }

    const now = new Date();
    const nextRunAt = new Date(now.getTime() + task.source.intervalHours * 60 * 60 * 1000);

    await prisma.discoveryTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        finishedAt: now,
        itemsFound: inserted,
      },
    });

    await prisma.discoverySource.update({
      where: { id: task.source.id },
      data: { lastRunAt: now, nextRunAt },
    });

    return { itemsFound: inserted, candidates };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    await prisma.discoveryTask.update({
      where: { id: taskId },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
    });
    throw error;
  }
}

export async function pollDueDiscoverySources(prisma: PrismaClient): Promise<string[]> {
  const now = new Date();
  const sources = await prisma.discoverySource.findMany({
    where: {
      deletedAt: null,
      isEnabled: true,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: [{ priority: "desc" }, { nextRunAt: "asc" }],
    take: 10,
  });

  const taskIds: string[] = [];
  for (const source of sources) {
    const task = await prisma.discoveryTask.create({
      data: { sourceId: source.id, status: "PENDING" },
    });
    taskIds.push(task.id);
  }
  return taskIds;
}
