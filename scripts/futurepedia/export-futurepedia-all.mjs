import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { runSources } from "../../packages/auto-update/dist/index.js";

function findWorkspaceRoot(start = process.cwd()) {
  let current = start;
  while (true) {
    const candidate = path.join(current, "pnpm-workspace.yaml");
    try {
      readFileSync(candidate, "utf8");
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return start;
      current = parent;
    }
  }
}

function readArgValue(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  return {
    limit: parseNumber(readArgValue(argv, "--limit"), 5000),
    concurrency: parseNumber(readArgValue(argv, "--concurrency"), 2),
    delayMs: parseNumber(readArgValue(argv, "--delay-ms"), 1200),
    timeoutMs: parseNumber(readArgValue(argv, "--timeout-ms"), 20000),
    retry: parseNumber(readArgValue(argv, "--retry"), 2),
    out: readArgValue(argv, "--out"),
  };
}

function buildDefaultOutputPath(root) {
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

function toExportRecord(candidate) {
  const metadata = candidate.metadata ?? {};
  const screenshots = Array.isArray(metadata.screenshots)
    ? metadata.screenshots.filter((value) => typeof value === "string" && value.trim().length > 0)
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
