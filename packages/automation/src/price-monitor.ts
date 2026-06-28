import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@ai-tool-cms/database";

function extractPricingSignals(html: string): Record<string, unknown> {
  const priceMatches = html.match(/\$\s?\d+(?:\.\d{2})?/g) ?? [];
  const planKeywords = ["free", "pro", "plus", "enterprise", "team", "business"];
  const plans = planKeywords.filter((kw) => html.toLowerCase().includes(kw));
  return {
    prices: [...new Set(priceMatches)].slice(0, 20),
    plans,
    hash: createHash("sha256")
      .update(priceMatches.join("|") + plans.join("|"))
      .digest("hex"),
  };
}

export async function checkPriceMonitor(
  prisma: PrismaClient,
  monitorId: string,
): Promise<{ changed: boolean }> {
  const monitor = await prisma.priceMonitor.findFirst({
    where: { id: monitorId, deletedAt: null },
    include: { tool: { include: { pricingPlans: { where: { deletedAt: null } } } } },
  });
  if (!monitor || monitor.status !== "ACTIVE") {
    return { changed: false };
  }

  const response = await fetch(monitor.pricingUrl, {
    headers: { "User-Agent": "ai-tool-cms-price-monitor/1.0" },
  });
  const html = await response.text();
  const snapshot = extractPricingSignals(html);
  const before = (monitor.lastSnapshot ?? {}) as Record<string, unknown>;
  const changed = Boolean(before.hash && before.hash !== snapshot.hash);
  const now = new Date();

  if (changed) {
    await prisma.priceChangeEvent.create({
      data: {
        monitorId,
        before: before as Prisma.InputJsonValue,
        after: snapshot as Prisma.InputJsonValue,
        metadata: { toolId: monitor.toolId },
      },
    });

    // 自动更新 pricing metadata
    await prisma.tool.update({
      where: { id: monitor.toolId },
      data: {
        metadata: {
          ...(monitor.tool.metadata as Prisma.JsonObject),
          lastPriceSnapshot: snapshot as Prisma.InputJsonValue,
          priceUpdatedAt: now.toISOString(),
        },
      },
    });
  }

  await prisma.priceMonitor.update({
    where: { id: monitorId },
    data: { lastSnapshot: snapshot as Prisma.InputJsonValue, lastCheckedAt: now },
  });

  return { changed };
}

export async function ensurePriceMonitorsForPublishedTools(prisma: PrismaClient): Promise<number> {
  const tools = await prisma.tool.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { id: true, website: true },
    take: 500,
  });
  let created = 0;
  for (const tool of tools) {
    const pricingUrl = tool.website.endsWith("/")
      ? `${tool.website}pricing`
      : `${tool.website}/pricing`;
    const existing = await prisma.priceMonitor.findFirst({
      where: { toolId: tool.id, pricingUrl, deletedAt: null },
    });
    if (existing) continue;
    await prisma.priceMonitor.create({
      data: { toolId: tool.id, pricingUrl, status: "ACTIVE" },
    });
    created += 1;
  }
  return created;
}

export async function pollPriceMonitors(prisma: PrismaClient): Promise<string[]> {
  const monitors = await prisma.priceMonitor.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
    take: 20,
    select: { id: true },
  });
  return monitors.map((m) => m.id);
}
