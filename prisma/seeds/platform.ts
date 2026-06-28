import type { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_TOOL_PUBLISH_WORKFLOW = [
  { id: "crawl", type: "CRAWL" },
  { id: "normalize", type: "NORMALIZE" },
  { id: "ai", type: "AI_SUMMARY" },
  { id: "seo", type: "AI_SEO" },
  { id: "publish", type: "AI_PUBLISH" },
  { id: "index", type: "INDEX" },
] as const;

async function ensureDefaultWorkflows(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.workflowDefinition.findFirst({
    where: { slug: "tool-publish-default", deletedAt: null },
  });
  if (existing) return;

  await prisma.workflowDefinition.create({
    data: {
      slug: "tool-publish-default",
      name: "Tool Publish Pipeline",
      description: "Crawler → Normalize → AI → SEO → Publish → Index",
      steps: DEFAULT_TOOL_PUBLISH_WORKFLOW as unknown as Prisma.InputJsonValue,
      isEnabled: true,
    },
  });
}

const BUILTIN_PLUGINS = [
  { slug: "builtin-seo", name: "SEO Plugin", module: "seo" },
  { slug: "builtin-crawler", name: "Crawler Plugin", module: "crawler" },
  { slug: "builtin-ai", name: "AI Plugin", module: "ai" },
  { slug: "builtin-analytics", name: "Analytics Plugin", module: "analytics" },
  { slug: "builtin-billing", name: "Billing Plugin", module: "billing" },
] as const;

export async function seedPlatform(prisma: PrismaClient): Promise<void> {
  await ensureDefaultWorkflows(prisma);

  for (const plugin of BUILTIN_PLUGINS) {
    await prisma.pluginRegistration.upsert({
      where: { slug: plugin.slug },
      create: {
        slug: plugin.slug,
        name: plugin.name,
        module: plugin.module,
        status: "ACTIVE",
      },
      update: {
        name: plugin.name,
        module: plugin.module,
        status: "ACTIVE",
        deletedAt: null,
      },
    });
  }

  await prisma.featureFlag.upsert({
    where: { key: "public_api_v1" },
    create: {
      key: "public_api_v1",
      name: "Public REST API v1",
      enabled: true,
      rollout: 100,
      description: "Enable Public API v1 endpoints",
    },
    update: {
      enabled: true,
      rollout: 100,
    },
  });
}
