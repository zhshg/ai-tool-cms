/**
 * Database seed - Commit 012 (demo) & Commit 020 (bulk).
 *
 * Usage:
 *   pnpm db:seed              # demo profile (default)
 *   SEED_PROFILE=bulk pnpm db:seed
 *   SEED_PROFILE=all pnpm db:seed
 */
import { prisma } from "./seeds/context";
import { seedBulkData } from "./seeds/bulk";
import { seedCrawlSources } from "./seeds/crawl-sources";
import { seedRolesAndPermissions } from "./seeds/rbac";
import { seedDefaultTaxonomy } from "./seeds/taxonomy";
import { seedPlatform } from "./seeds/platform";
import { seedPublicCatalog } from "./seeds/public-catalog";

async function main(): Promise<void> {
  const profile = process.env.SEED_PROFILE ?? "demo";
  console.info(`[seed] profile=${profile}`);

  const { adminUserId } = await seedRolesAndPermissions();
  console.info("[seed] roles, permissions, admin user ready");

  const { categoryIds, tagIds } = await seedDefaultTaxonomy(adminUserId);
  console.info(`[seed] default taxonomy: ${categoryIds.length} categories, ${tagIds.length} tags`);

  await seedPlatform(prisma);
  console.info("[seed] platform: workflows, plugins, feature flags");

  if (profile === "demo" || profile === "all") {
    const publicCatalog = await seedPublicCatalog(adminUserId);
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
