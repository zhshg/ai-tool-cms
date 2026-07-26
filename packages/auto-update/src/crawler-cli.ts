import path from "node:path";
import * as configPkg from "@ai-tool-cms/config";
import type { Prisma } from "@ai-tool-cms/database";
import { ToolStatus } from "@ai-tool-cms/database";
import * as searchPkg from "@ai-tool-cms/search";
import { PrismaClient } from "../../database/generated/crawler-client/index.js";
import {
  buildRunArtifactId,
  buildRunArtifactPaths,
  writeCandidateSnapshot,
  writeLog,
  writeReport,
} from "./persistence";
import { planCrawlerImports } from "./crawler-plan";
import { runSources, type SourceFetchRuntimeOptions } from "./sources";
import type {
  ExistingCategoryLite,
  ExistingToolLite,
  PlannedCrawlerTool,
  SourceId,
  CrawlerPlanDecision,
} from "./types";

const { loadRootDotenv, findWorkspaceRoot } = configPkg;
const { enqueueSearchIndex } = searchPkg;

loadRootDotenv();

const prisma = new PrismaClient();

type CrawlerCliOptions = {
  sourceIds: SourceId[];
  limit: number;
  dryRun: boolean;
  updateExisting: boolean;
  categoryFallbackSlug: string | null;
  status: ToolStatus;
  skipLogo: boolean;
  concurrency: number;
  delayMs: number;
  timeoutMs: number;
  retry: number;
};

const SOURCE_ALIASES: Record<string, SourceId> = {
  aitoolsdirectory: "aitoolsdirectory",
  futurepedia: "futurepedia",
  taaft: "taaft",
  theresanaiforthat: "theresanaiforthat",
  "github-trending": "github-trending",
  githubtrending: "github-trending",
  "huggingface-spaces": "huggingface-spaces",
  huggingfacespaces: "huggingface-spaces",
  hackernews: "hackernews",
  "reddit-ai": "reddit-ai",
  redditai: "reddit-ai",
  producthunt: "producthunt",
};

function readArgValue(argv: string[], names: string[]) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    for (const name of names) {
      if (token === name) return argv[index + 1];
      if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
    }
  }
  return undefined;
}

function hasFlag(argv: string[], names: string[]) {
  return argv.some((token) => names.includes(token));
}

function parseSourceIds(argv: string[]) {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--source") {
      const value = argv[index + 1];
      if (value) values.push(value);
      continue;
    }
    if (token.startsWith("--source=")) {
      values.push(token.slice("--source=".length));
    }
  }

  const normalized = values.length ? values : ["futurepedia"];
  return normalized.map((value) => {
    const key = value.trim().toLowerCase();
    const resolved = SOURCE_ALIASES[key];
    if (!resolved) {
      throw new Error(`Unsupported source '${value}'.`);
    }
    return resolved;
  });
}

function parseStatus(value: string | undefined) {
  const normalized = (value ?? "PUBLISHED").trim().toUpperCase();
  if (normalized === "DRAFT") return ToolStatus.DRAFT;
  if (normalized === "PUBLISHED" || normalized === "PUBLISH") return ToolStatus.PUBLISHED;
  throw new Error(`Unsupported status '${value}'. Expected DRAFT or PUBLISHED.`);
}

function parseArgs(argv: string[]): CrawlerCliOptions {
  const limit = Number(readArgValue(argv, ["--limit"]) ?? "10");
  const concurrency = Number(readArgValue(argv, ["--concurrency"]) ?? "2");
  const delayMs = Number(readArgValue(argv, ["--delay-ms"]) ?? "1000");
  const timeoutMs = Number(readArgValue(argv, ["--timeout-ms"]) ?? "15000");
  const retry = Number(readArgValue(argv, ["--retry"]) ?? "2");

  return {
    sourceIds: parseSourceIds(argv),
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    dryRun: hasFlag(argv, ["--dry-run"]),
    updateExisting: hasFlag(argv, ["--update-existing"]),
    categoryFallbackSlug: readArgValue(argv, ["--category-fallback"]) ?? "ai-productivity",
    status: parseStatus(readArgValue(argv, ["--status"])),
    skipLogo: hasFlag(argv, ["--skip-logo"]),
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 1000,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000,
    retry: Number.isFinite(retry) && retry >= 0 ? retry : 2,
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
      metaTitle: true,
      metaDescription: true,
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
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    status: row.status,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    categorySlugs: row.categories.map((item) => item.category.slug),
    tagNames: row.tags.map((item) => item.tag.name),
  }));
}

async function loadCategories(): Promise<ExistingCategoryLite[]> {
  return prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

async function ensureTagIds(tags: string[]) {
  const tagIds: string[] = [];
  for (const tagName of tags) {
    const slug = tagName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) continue;
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
        name: tagName,
        metadata: { crawlerCreated: true },
      },
      select: { id: true },
    });
    tagIds.push(created.id);
  }
  return tagIds;
}

async function syncPrimaryCategory(toolId: string, categoryId: string) {
  await prisma.toolCategory.updateMany({
    where: { toolId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  await prisma.toolCategory.upsert({
    where: { toolId_categoryId: { toolId, categoryId } },
    update: { deletedAt: null, isPrimary: true },
    create: { toolId, categoryId, isPrimary: true },
  });
}

async function syncTags(toolId: string, tagIds: string[]) {
  await prisma.toolTag.updateMany({
    where: { toolId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  for (const tagId of tagIds) {
    await prisma.toolTag.upsert({
      where: { toolId_tagId: { toolId, tagId } },
      update: { deletedAt: null },
      create: { toolId, tagId },
    });
  }
}

async function createTool(normalized: PlannedCrawlerTool) {
  const tagIds = await ensureTagIds(normalized.tags);
  const created = await prisma.tool.create({
    data: {
      slug: normalized.slug,
      name: normalized.name,
      website: normalized.website,
      summary: normalized.summary,
      description: normalized.description,
      longDescription: normalized.description,
      logoUrl: normalized.logoUrl,
      pricingModel: normalized.pricingModel,
      status: normalized.status,
      metaTitle: normalized.metaTitle,
      metaDescription: normalized.metaDescription,
      publishedAt: normalized.status === ToolStatus.PUBLISHED ? new Date() : undefined,
      metadata: normalized.metadata as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  await syncPrimaryCategory(created.id, normalized.categoryId);
  await syncTags(created.id, tagIds);
  if (normalized.status === ToolStatus.PUBLISHED) {
    await enqueueSearchIndex(created.id, "publish");
  }
  return created.id;
}

async function updateTool(decision: CrawlerPlanDecision) {
  if (!decision.matchedToolId) return null;
  const data: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  for (const field of decision.updateFields) {
    if (field === "logoUrl") data.logoUrl = decision.normalized.logoUrl;
    if (field === "summary") data.summary = decision.normalized.summary;
    if (field === "description") {
      data.description = decision.normalized.description;
      data.longDescription = decision.normalized.description;
    }
    if (field === "metaTitle") data.metaTitle = decision.normalized.metaTitle;
    if (field === "metaDescription") data.metaDescription = decision.normalized.metaDescription;
    if (field === "status") {
      data.status = decision.normalized.status;
      data.publishedAt =
        decision.normalized.status === ToolStatus.PUBLISHED ? new Date() : undefined;
    }
  }

  const existing = await prisma.tool.findUnique({
    where: { id: decision.matchedToolId },
    select: { metadata: true, status: true },
  });
  data.metadata = {
    ...((existing?.metadata ?? {}) as Record<string, unknown>),
    crawler: {
      ...(decision.normalized.metadata.crawler as Record<string, unknown>),
      updatedExisting: true,
    },
  } as Prisma.InputJsonValue;

  await prisma.tool.update({
    where: { id: decision.matchedToolId },
    data,
  });

  if (decision.updateFields.includes("category")) {
    await syncPrimaryCategory(decision.matchedToolId, decision.normalized.categoryId);
  }
  if (decision.updateFields.includes("tags")) {
    const tagIds = await ensureTagIds(decision.normalized.tags);
    await syncTags(decision.matchedToolId, tagIds);
  }

  if (
    (existing?.status ?? ToolStatus.DRAFT) === ToolStatus.PUBLISHED ||
    decision.updateFields.includes("status")
  ) {
    await enqueueSearchIndex(decision.matchedToolId, "tool_update");
  }

  return decision.matchedToolId;
}

function buildCrawlerReport(
  options: CrawlerCliOptions,
  decisions: CrawlerPlanDecision[],
  sourceResults: Awaited<ReturnType<typeof runSources>>,
) {
  const summaryLines = [
    `- sources: ${options.sourceIds.map((item) => `\`${item}\``).join(", ")}`,
    `- dry-run: \`${String(options.dryRun)}\``,
    `- update-existing: \`${String(options.updateExisting)}\``,
    `- limit: \`${options.limit}\``,
    `- status: \`${options.status}\``,
    `- delay-ms: \`${options.delayMs}\``,
    `- concurrency: \`${options.concurrency}\``,
  ];

  const decisionLines = decisions
    .slice(0, 20)
    .flatMap((decision, index) => [
      `### ${index + 1}. ${decision.normalized.name}`,
      `- action: \`${decision.action}\``,
      `- slug: \`${decision.normalized.slug}\``,
      `- website: ${decision.normalized.website || "invalid"}`,
      `- category: \`${decision.normalized.categorySlug || "none"}\``,
      `- warnings: ${decision.warnings.length ? decision.warnings.join("; ") : "none"}`,
      `- validationErrors: ${decision.validationErrors.length ? decision.validationErrors.join("; ") : "none"}`,
      "",
    ]);

  return [
    "# Crawler Run Report",
    "",
    "## Summary",
    ...summaryLines,
    "",
    "## Sources",
    ...sourceResults.map(
      (source) =>
        `- ${source.sourceName} (\`${source.sourceId}\`): fetched=${source.fetchedCount}, errors=${source.errors.length}`,
    ),
    "",
    "## Sample Decisions",
    ...decisionLines,
  ].join("\n");
}

async function applyPlan(decisions: CrawlerPlanDecision[]) {
  const createdIds: string[] = [];
  const updatedIds: string[] = [];
  for (const decision of decisions) {
    if (decision.action === "create") {
      const createdId = await createTool(decision.normalized);
      createdIds.push(createdId);
      continue;
    }
    if (decision.action === "update") {
      const updatedId = await updateTool(decision);
      if (updatedId) updatedIds.push(updatedId);
    }
  }
  return { createdIds, updatedIds };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtimeOptions: SourceFetchRuntimeOptions = {
    timeoutMs: options.timeoutMs,
    retry: options.retry,
    delayMs: options.delayMs,
    concurrency: options.concurrency,
  };

  const [existingTools, categories] = await Promise.all([loadExistingTools(), loadCategories()]);
  const sourceResults = await runSources(options.sourceIds, options.limit, runtimeOptions);
  const candidates = sourceResults.flatMap((source) => source.candidates);
  const planned = planCrawlerImports({
    candidates,
    existingTools,
    categories,
    options: {
      updateExisting: options.updateExisting,
      categoryFallbackSlug: options.categoryFallbackSlug,
      defaultStatus: options.status,
      skipLogo: options.skipLogo,
    },
  });

  const runId = buildRunArtifactId(
    new Date().toISOString().slice(0, 10),
    options.sourceIds,
    new Date().toISOString(),
  );
  const artifactPaths = buildRunArtifactPaths(findWorkspaceRoot(), runId);
  const snapshotPath = writeCandidateSnapshot(runId, {
    options,
    sourceResults,
    planned,
  });
  const reportPath = writeReport(
    runId,
    buildCrawlerReport(options, planned.decisions, sourceResults),
  );
  const logs = [
    `[crawler:run] dryRun=${options.dryRun}`,
    `[crawler:run] source=${options.sourceIds.join(",")}`,
    `[crawler:run] limit=${options.limit}`,
    `[crawler:run] planCreate=${planned.summary.planCreateCount}`,
    `[crawler:run] planUpdate=${planned.summary.planUpdateCount}`,
    `[crawler:run] skip=${planned.summary.skipCount}`,
    `[crawler:run] duplicate=${planned.summary.duplicateCount}`,
    `[crawler:run] fallbackCategory=${planned.summary.fallbackCategoryCount}`,
    `[crawler:run] missingField=${planned.summary.missingFieldCount}`,
    `[crawler:run] suspectedFakeUrl=${planned.summary.suspectedFakeUrlCount}`,
    `[crawler:run] snapshot=${path.relative(findWorkspaceRoot(), snapshotPath)}`,
    `[crawler:run] report=${path.relative(findWorkspaceRoot(), reportPath)}`,
  ];

  let createdIds: string[] = [];
  let updatedIds: string[] = [];
  if (!options.dryRun) {
    const applied = await applyPlan(planned.decisions);
    createdIds = applied.createdIds;
    updatedIds = applied.updatedIds;
    logs.push(`[crawler:run] appliedCreate=${createdIds.length}`);
    logs.push(`[crawler:run] appliedUpdate=${updatedIds.length}`);
  }

  const logPath = writeLog(
    runId,
    logs.concat(`[crawler:run] log=${path.relative(findWorkspaceRoot(), artifactPaths.log)}`),
  );

  console.info(`[crawler:run] source=${options.sourceIds.join(",")}`);
  console.info(`[crawler:run] dryRun=${options.dryRun}`);
  console.info(`[crawler:run] fetched=${planned.summary.totalFetched}`);
  console.info(`[crawler:run] planCreate=${planned.summary.planCreateCount}`);
  console.info(`[crawler:run] planUpdate=${planned.summary.planUpdateCount}`);
  console.info(`[crawler:run] skip=${planned.summary.skipCount}`);
  console.info(`[crawler:run] duplicate=${planned.summary.duplicateCount}`);
  console.info(`[crawler:run] fallbackCategory=${planned.summary.fallbackCategoryCount}`);
  console.info(`[crawler:run] missingField=${planned.summary.missingFieldCount}`);
  console.info(`[crawler:run] suspectedFakeUrl=${planned.summary.suspectedFakeUrlCount}`);
  console.info(`[crawler:run] sampleTop=${planned.summary.sampleCount}`);

  for (const decision of planned.decisions.slice(0, 10)) {
    console.info(
      `[crawler:run][sample] action=${decision.action} slug=${decision.normalized.slug} website=${decision.normalized.website} category=${decision.normalized.categorySlug || "none"}`,
    );
  }

  if (!options.dryRun) {
    console.info(`[crawler:run] created=${createdIds.length}`);
    console.info(`[crawler:run] updated=${updatedIds.length}`);
  }

  console.info(`[crawler:run] snapshot=${path.relative(findWorkspaceRoot(), snapshotPath)}`);
  console.info(`[crawler:run] report=${path.relative(findWorkspaceRoot(), reportPath)}`);
  console.info(`[crawler:run] log=${path.relative(findWorkspaceRoot(), logPath)}`);
}

main()
  .catch((error) => {
    console.error(
      `[crawler:run][error] ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
