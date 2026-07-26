import path from "node:path";
import * as configPkg from "@ai-tool-cms/config";
import * as commonPkg from "@ai-tool-cms/common";
import { PrismaClient } from "../../database/generated/crawler-client/index.js";
import type {
  AutoUpdateMode,
  AutoUpdateOptions,
  ExistingToolLite,
  PersistedCandidateSnapshot,
  SourceId,
} from "./types";
import { CATEGORY_WHITELIST_SET, DEFAULT_SOURCE_LIMITS } from "./constants";
import {
  buildRunArtifactId,
  buildRunArtifactPaths,
  writeCandidateSnapshot,
  writeLog,
  writeReport,
} from "./persistence";
import { mapDecisionStatusToToolStatus, planCandidates } from "./planner";
import { renderReport } from "./report";
import { runSources } from "./sources";

const { loadRootDotenv, findWorkspaceRoot } = configPkg;
const { STANDARD_AI_CATEGORIES, resolveCanonicalCategorySlug, slugify } = commonPkg;

loadRootDotenv();

const prisma = new PrismaClient();

function parseArgs(argv: string[]): AutoUpdateOptions {
  const getValue = (prefix: string) =>
    argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const sourceIds = argv
    .filter((arg) => arg.startsWith("--source="))
    .map((arg) => arg.slice("--source=".length) as SourceId);
  const mode =
    (getValue("--mode=") as AutoUpdateMode | undefined) ??
    (process.env.TOOLS_AUTO_MODE as AutoUpdateMode | undefined) ??
    "manual-review";
  const date = getValue("--date=") ?? new Date().toISOString().slice(0, 10);
  const limit = Number(getValue("--limit=") ?? process.env.TOOLS_AUTO_DAILY_LIMIT ?? "5");
  const fetchDelayMs = Number(
    getValue("--delay-ms=") ?? process.env.TOOLS_AUTO_FETCH_DELAY_MS ?? "1000",
  );
  const fetchConcurrency = Number(
    getValue("--concurrency=") ?? process.env.TOOLS_AUTO_FETCH_CONCURRENCY ?? "2",
  );
  const fetchRetry = Number(getValue("--retry=") ?? process.env.TOOLS_AUTO_FETCH_RETRY ?? "2");
  const fetchTimeoutMs = Number(
    getValue("--timeout-ms=") ?? process.env.TOOLS_AUTO_FETCH_TIMEOUT_MS ?? "15000",
  );
  const apply = argv.includes("--apply");
  return {
    mode,
    limit: Number.isFinite(limit) ? limit : 5,
    dryRun: argv.includes("--dry-run") || !apply,
    apply,
    report: true,
    date,
    sourceIds: sourceIds.length ? sourceIds : (Object.keys(DEFAULT_SOURCE_LIMITS) as SourceId[]),
    autoApplyEnabled: String(process.env.TOOLS_AUTO_APPLY ?? "false").toLowerCase() === "true",
    autoUpdateEnabled:
      String(process.env.TOOLS_AUTO_UPDATE_ENABLED ?? "true").toLowerCase() === "true",
    dailyLimit: Number(process.env.TOOLS_AUTO_DAILY_LIMIT ?? "5"),
    minConfidence: Number(process.env.TOOLS_AUTO_MIN_CONFIDENCE ?? "0.85"),
    fetchDelayMs: Number.isFinite(fetchDelayMs) ? Math.max(0, fetchDelayMs) : 1000,
    fetchConcurrency: Number.isFinite(fetchConcurrency) ? Math.max(1, fetchConcurrency) : 2,
    fetchRetry: Number.isFinite(fetchRetry) ? Math.max(0, fetchRetry) : 2,
    fetchTimeoutMs: Number.isFinite(fetchTimeoutMs) ? Math.max(1000, fetchTimeoutMs) : 15000,
  };
}

async function loadExistingTools(): Promise<ExistingToolLite[]> {
  const rows = await prisma.tool.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      website: true,
      logoUrl: true,
      summary: true,
      description: true,
      status: true,
      metadata: true,
      categories: { where: { deletedAt: null }, include: { category: true } },
      tags: { where: { deletedAt: null }, include: { tag: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    website: row.website,
    logoUrl: row.logoUrl,
    summary: row.summary,
    description: row.description,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    categorySlugs: row.categories.map((item) => item.category.slug),
    tagNames: row.tags.map((item) => item.tag.name),
  }));
}

async function ensureCategoryId(name: string): Promise<string> {
  const normalizedName = name.trim();
  const canonicalSlug = resolveCanonicalCategorySlug(normalizedName);
  const canonicalCategory = STANDARD_AI_CATEGORIES.find((item) => item.slug === canonicalSlug);
  if (!canonicalSlug || !canonicalCategory || !CATEGORY_WHITELIST_SET.has(canonicalCategory.name)) {
    throw new Error(`Category '${normalizedName}' is outside the whitelist`);
  }
  const slug = canonicalSlug;
  const existing = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: {
      slug,
      name: canonicalCategory.name,
      description: canonicalCategory.description,
      metaTitle: canonicalCategory.seoTitle,
      metaDescription: canonicalCategory.seoDescription,
      metadata: { autoUpdateCreated: true },
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureTagIds(tags: string[]): Promise<string[]> {
  const tagIds: string[] = [];
  for (const name of tags) {
    const clean = name.trim();
    if (!clean) continue;
    const slug = slugify(clean);
    const existing = await prisma.tag.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }
    const created = await prisma.tag.create({
      data: {
        slug,
        name: clean,
        metadata: { autoUpdateCreated: true },
      },
      select: { id: true },
    });
    tagIds.push(created.id);
  }
  return tagIds;
}

async function invalidatePublicCaches(logs: string[]) {
  try {
    const { getRedisClient } = await import("@ai-tool-cms/cache");
    const redis = await getRedisClient();
    if (!redis) {
      logs.push("[cache] redis unavailable, skipped cache invalidation");
      return;
    }
    const redisClient = redis as unknown as {
      keys: (pattern: string) => Promise<string[]>;
      del: (...keys: string[]) => Promise<number>;
    };
    const patterns = ["api:atcms:public:*", "api:atcms:*search*"];
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length) await redisClient.del(...keys);
      logs.push(`[cache] pattern ${pattern} removed ${keys.length} keys`);
    }
  } catch (error) {
    logs.push(
      `[cache] invalidate failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

async function applySafeCreates(
  options: AutoUpdateOptions,
  decisions: PersistedCandidateSnapshot["decisions"],
  logs: string[],
) {
  if (options.mode !== "safe-auto") {
    throw new Error("Apply is only supported for safe-auto in phase 1");
  }
  if (!options.autoApplyEnabled) {
    throw new Error("TOOLS_AUTO_APPLY=false blocks automatic apply");
  }
  const creatable = decisions
    .filter((decision) => decision.status === "create" && decision.publish)
    .slice(0, options.dailyLimit);

  for (const decision of creatable) {
    const categoryId = await ensureCategoryId(decision.candidate.category!);
    const tagIds = await ensureTagIds(decision.candidate.tags);
    const created = await prisma.tool.create({
      data: {
        slug: decision.candidate.slug,
        name: decision.candidate.name,
        website: decision.candidate.websiteUrl!,
        logoUrl: decision.candidate.logoUrl,
        summary: decision.candidate.shortDescription,
        description: decision.candidate.description,
        pricingModel: decision.candidate.pricingType,
        status: mapDecisionStatusToToolStatus(decision),
        publishedAt: decision.publish ? new Date() : undefined,
        metadata: {
          autoUpdate: {
            sourceId: decision.candidate.sourceId,
            sourceName: decision.candidate.sourceName,
            sourceUrl: decision.candidate.sourceUrl,
            confidenceScore: decision.candidate.confidenceScore,
            discoveredAt: decision.candidate.discoveredAt,
            reportDate: options.date,
          },
          tags: decision.candidate.tags,
        },
      },
      select: { id: true, slug: true },
    });
    await prisma.toolCategory.create({
      data: {
        toolId: created.id,
        categoryId,
        isPrimary: true,
      },
    });
    for (const tagId of tagIds) {
      await prisma.toolTag.upsert({
        where: { toolId_tagId: { toolId: created.id, tagId } },
        update: { deletedAt: null },
        create: { toolId: created.id, tagId },
      });
    }
    const { enqueueSearchIndex } = await import("@ai-tool-cms/search");
    await enqueueSearchIndex(created.id, "publish");
    logs.push(`[apply] created ${created.slug}`);
  }

  await invalidatePublicCaches(logs);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  logs.push(
    `[run] mode=${options.mode} dryRun=${options.dryRun} apply=${options.apply} date=${options.date}`,
  );
  logs.push(
    `[run] fetch delayMs=${options.fetchDelayMs} concurrency=${options.fetchConcurrency} retry=${options.fetchRetry} timeoutMs=${options.fetchTimeoutMs}`,
  );

  if (!options.autoUpdateEnabled) {
    throw new Error("TOOLS_AUTO_UPDATE_ENABLED=false");
  }
  if (options.mode === "manual-review" && options.apply) {
    throw new Error("manual-review mode does not allow apply");
  }

  const sourceRuns = await runSources(options.sourceIds, options.limit, {
    delayMs: options.fetchDelayMs,
    concurrency: options.fetchConcurrency,
    retry: options.fetchRetry,
    timeoutMs: options.fetchTimeoutMs,
  });
  sourceRuns.forEach((run) => {
    run.errors.forEach((error) => errors.push(`${run.sourceId}: ${error}`));
  });

  const candidates = sourceRuns.flatMap((run) => run.candidates);
  const existingTools = await loadExistingTools();
  const { decisions, summary } = planCandidates({
    mode: options.mode,
    dailyLimit: Math.min(options.dailyLimit, 5),
    minConfidence: options.minConfidence,
    candidates,
    existingTools,
  });

  if (!summary.createCount) warnings.push("new tool count is 0");
  if (decisions.every((item) => !item.candidate.logoUrl)) warnings.push("logo all missing");
  if (decisions.some((item) => !item.candidate.category)) warnings.push("category missing");
  if (decisions.some((item) => item.reasons.some((reason) => reason.includes("placeholder")))) {
    warnings.push("suspectedFake > 0");
  }
  if (options.mode === "safe-auto" && decisions.some((item) => item.status === "update-empty")) {
    warnings.push("safe-auto planned non-create operation");
  }
  if (decisions.filter((item) => item.status === "update-empty").length > 5) {
    warnings.push("planned update-empty count exceeds 5");
  }

  const snapshot: PersistedCandidateSnapshot = {
    generatedAt: new Date().toISOString(),
    date: options.date,
    mode: options.mode,
    options: {
      limit: options.limit,
      dryRun: options.dryRun,
      apply: options.apply,
      sourceIds: options.sourceIds,
      fetchDelayMs: options.fetchDelayMs,
      fetchConcurrency: options.fetchConcurrency,
      fetchRetry: options.fetchRetry,
      fetchTimeoutMs: options.fetchTimeoutMs,
    },
    sources: sourceRuns,
    decisions,
    summary,
  };

  if (options.apply && !options.dryRun) {
    await applySafeCreates(options, decisions, logs);
  }

  const runId = buildRunArtifactId(options.date, options.sourceIds, snapshot.generatedAt);
  const snapshotPath = writeCandidateSnapshot(runId, snapshot);
  const artifactPaths = buildRunArtifactPaths(findWorkspaceRoot(), runId);

  const report = renderReport({
    options,
    summary,
    sources: sourceRuns,
    decisions,
    errors,
    warnings,
    snapshotPath: path.relative(findWorkspaceRoot(), snapshotPath),
    logPath: path.relative(findWorkspaceRoot(), artifactPaths.log),
  });
  const reportPath = writeReport(runId, report);
  logs.push(`[report] ${path.relative(findWorkspaceRoot(), reportPath)}`);
  const logPath = writeLog(
    runId,
    logs.concat(
      errors.map((line) => `[error] ${line}`),
      warnings.map((line) => `[warning] ${line}`),
    ),
  );

  console.info(`[tools:auto-update] mode=${options.mode}`);
  console.info(`[tools:auto-update] dryRun=${options.dryRun}`);
  console.info(`[tools:auto-update] fetched=${summary.totalFetched}`);
  console.info(
    `[tools:auto-update] create=${summary.createCount} draft=${summary.draftCount} updateEmpty=${summary.updateEmptyCount} skip=${summary.skipCount}`,
  );
  console.info(`[tools:auto-update] report=${path.relative(findWorkspaceRoot(), reportPath)}`);
  console.info(`[tools:auto-update] snapshot=${path.relative(findWorkspaceRoot(), snapshotPath)}`);
  console.info(`[tools:auto-update] log=${path.relative(findWorkspaceRoot(), logPath)}`);
  warnings.forEach((warning) => console.warn(`[tools:auto-update][warning] ${warning}`));
}

main()
  .catch((error) => {
    console.error(
      `[tools:auto-update][error] ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
