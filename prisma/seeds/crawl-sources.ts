import { upsertBySlug } from "./helpers";
import { prisma } from "./context";

const DEFAULT_SOURCES = [
  {
    slug: "toolify",
    name: "Toolify",
    baseUrl: "https://www.toolify.ai",
    adapterType: "toolify",
    priority: 100,
  },
  {
    slug: "futurepedia",
    name: "Futurepedia",
    baseUrl: "https://www.futurepedia.io",
    adapterType: "futurepedia",
    priority: 90,
  },
  {
    slug: "taaft",
    name: "There's An AI For That",
    baseUrl: "https://theresanaiforthat.com",
    adapterType: "taaft",
    priority: 80,
  },
] as const;

export async function seedCrawlSources(actorId: string): Promise<void> {
  for (const source of DEFAULT_SOURCES) {
    await upsertBySlug(
      prisma.crawlSource,
      source.slug,
      {
        name: source.name,
        baseUrl: source.baseUrl,
        adapterType: source.adapterType,
        status: "ENABLED",
        schedule: "DAILY",
        crawlIntervalMinutes: 1440,
        priority: source.priority,
        isEnabled: true,
        createdById: actorId,
        metadata: { seeded: true },
      },
      {
        name: source.name,
        baseUrl: source.baseUrl,
        adapterType: source.adapterType,
        priority: source.priority,
        deletedAt: null,
        updatedById: actorId,
      },
    );
  }
}
