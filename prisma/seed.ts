/**
 * Database seed - curated launch dataset by default.
 *
 * Usage:
 *   pnpm db:seed              # demo profile (default)
 *   ALLOW_FAKE_SEED=true SEED_PROFILE=bulk pnpm db:seed
 *   ALLOW_FAKE_SEED=true SEED_PROFILE=all pnpm db:seed
 */
import { prisma } from "./seeds/context";
import { seedBulkData } from "./seeds/bulk";
import { seedCuratedTools } from "./seeds/curated-tools";
import { seedCrawlSources } from "./seeds/crawl-sources";
import { seedRolesAndPermissions } from "./seeds/rbac";
import { seedDefaultTaxonomy } from "./seeds/taxonomy";
import { seedPlatform } from "./seeds/platform";

async function main(): Promise<void> {
  const profile = process.env.SEED_PROFILE ?? "demo";
  const allowFakeSeed = process.env.ALLOW_FAKE_SEED === "true";
  console.info(`[seed] profile=${profile}`);

  if ((profile === "bulk" || profile === "all") && !allowFakeSeed) {
    throw new Error(
      [
        "Bulk seed profile is blocked by default because it creates fake/example data.",
        "For launch-readiness and production-like environments, use the curated dataset only.",
        "If you intentionally need demo bulk data for local experiments, rerun with ALLOW_FAKE_SEED=true.",
      ].join(" "),
    );
  }

  const { adminUserId } = await seedRolesAndPermissions();
  console.info("[seed] roles, permissions, admin user ready");

  const { categoryIds, tagIds } = await seedDefaultTaxonomy(adminUserId);
  console.info(`[seed] default taxonomy: ${categoryIds.length} categories, ${tagIds.length} tags`);

  await seedPlatform(prisma);
  console.info("[seed] platform: workflows, plugins, feature flags");

  if (profile === "demo" || profile === "all") {
    const publicCatalog = await seedCuratedTools(adminUserId);
    console.info(
      `[seed] public catalog: ${publicCatalog.categoryIds.length} categories, ${publicCatalog.tagIds.length} tags, ${publicCatalog.toolIds.length} tools`,
    );
    await seedCrawlSources(adminUserId);
    console.info("[seed] mock crawl source seeded (framework validation)");
  }

  if (profile === "bulk" || profile === "all") {
    await seedBulkData(adminUserId);
    console.info("[seed] bulk data: 100 categories, 500 tags, 100 tools, 50 prompts, 20 faqs");
  }

  console.info("[seed] done");
}

main()
  .catch((error: unknown) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
