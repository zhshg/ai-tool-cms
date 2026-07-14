import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as configPkg from "@ai-tool-cms/config";
import {
  findWorkspaceRoot,
  runSources,
  type CandidateDraft,
} from "../../packages/auto-update/src/index.ts";

const { loadRootDotenv } = configPkg;

loadRootDotenv();

type CliOptions = {
  limit: number;
  concurrency: number;
  delayMs: number;
  timeoutMs: number;
  retry: number;
  out?: string;
};

type ExportedFuturepediaTool = {
  name: string;
  slug: string;
  sourceUrl: string;
  officialWebsiteUrl: string | null;
  logoUrl: string | null;
  screenshots: string[];
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  confidenceScore: number;
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
};

function readArgValue(argv: string[], name: string) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv: string[]): CliOptions {
  return {
    limit: parseNumber(readArgValue(argv, "--limit"), 5000),
    concurrency: parseNumber(readArgValue(argv, "--concurrency"), 2),
    delayMs: parseNumber(readArgValue(argv, "--delay-ms"), 1200),
    timeoutMs: parseNumber(readArgValue(argv, "--timeout-ms"), 20000),
    retry: parseNumber(readArgValue(argv, "--retry"), 2),
    out: readArgValue(argv, "--out"),
  };
}

function buildDefaultOutputPath(root: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return path.join(
    root,
    "storage",
    "imports",
    "futurepedia",
    `futurepedia-all-tools-${stamp}.json`,
  );
}

function toExportRecord(candidate: CandidateDraft): ExportedFuturepediaTool {
  const metadata = candidate.metadata ?? {};
  const screenshots = Array.isArray(metadata.screenshots)
    ? metadata.screenshots.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];

  return {
    name: candidate.name,
    slug: candidate.slug,
    sourceUrl: candidate.sourceUrl,
    officialWebsiteUrl: candidate.websiteUrl,
    logoUrl: candidate.logoUrl,
    screenshots,
    shortDescription: candidate.shortDescription,
    description: candidate.description,
    category: candidate.category,
    tags: candidate.tags,
    confidenceScore: candidate.confidenceScore,
    isValid: candidate.isValid,
    validationErrors: candidate.validationErrors,
    warnings: candidate.warnings,
    metadata,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = findWorkspaceRoot();
  const outputPath = options.out ? path.resolve(root, options.out) : buildDefaultOutputPath(root);

  const [result] = await runSources(["futurepedia"], options.limit, {
    concurrency: options.concurrency,
    delayMs: options.delayMs,
    timeoutMs: options.timeoutMs,
    retry: options.retry,
  });

  if (!result) {
    throw new Error("Futurepedia source did not return a result.");
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceId: result.sourceId,
    sourceName: result.sourceName,
    requestedLimit: result.requestedLimit,
    fetchedCount: result.fetchedCount,
    errors: result.errors,
    validCount: result.candidates.filter((item) => item.isValid).length,
    invalidCount: result.candidates.filter((item) => !item.isValid).length,
    withLogoCount: result.candidates.filter((item) => Boolean(item.logoUrl)).length,
    withScreenshotCount: result.candidates.filter((item) => {
      const screenshots = item.metadata?.screenshots;
      return Array.isArray(screenshots) && screenshots.length > 0;
    }).length,
    tools: result.candidates.map(toExportRecord),
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.info(`[futurepedia:export] fetched=${payload.fetchedCount}`);
  console.info(`[futurepedia:export] valid=${payload.validCount}`);
  console.info(`[futurepedia:export] invalid=${payload.invalidCount}`);
  console.info(`[futurepedia:export] withLogo=${payload.withLogoCount}`);
  console.info(`[futurepedia:export] withScreenshots=${payload.withScreenshotCount}`);
  console.info(`[futurepedia:export] output=${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(
    `[futurepedia:export][error] ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
