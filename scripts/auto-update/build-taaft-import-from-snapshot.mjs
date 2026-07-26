import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOGO_XPATH = '//*[@id="overview"]/div[2]/div[1]/div[1]/div/img';
const SCREENSHOT_XPATH = '//*[@id="image_ai_link"]/img';

function rootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "../..");
}

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toPricingModel(value) {
  switch (
    String(value || "")
      .trim()
      .toLowerCase()
  ) {
    case "freemium":
      return "FREEMIUM";
    case "paid":
      return "PAID";
    case "custom":
      return "CONTACT";
    default:
      return "FREE";
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanUrl(value) {
  const text = decodeHtml(String(value || "").trim());
  if (!text) return null;
  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

function stripHtml(value) {
  return decodeHtml(String(value || ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueParagraphs(values) {
  return [...new Set(values.map((value) => stripHtml(value)).filter(Boolean))];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function extractScreenshotUrl(html) {
  const linkedBlock =
    html.match(/id="image_ai_link"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/id='image_ai_link'[^>]*>[\s\S]*?<img[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+class="[^"]*\bai_image\b[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*\bai_image\b[^"]*"/i)?.[1] ??
    html.match(/<img[^>]+class='[^']*\bai_image\b[^']*'[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+src='([^']+)'[^>]+class='[^']*\bai_image\b[^']*'/i)?.[1] ??
    null;
  return cleanUrl(linkedBlock);
}

function extractOverviewLogoUrl(html) {
  const overviewBlock =
    html.match(/id="overview"[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/id='overview'[\s\S]*?<img[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+class="[^"]*\btaaft_icon\b[^"]*"[^>]+src="([^"]+)"/i)?.[1] ??
    html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*\btaaft_icon\b[^"]*"/i)?.[1] ??
    html.match(/<img[^>]+class='[^']*\btaaft_icon\b[^']*'[^>]+src='([^']+)'/i)?.[1] ??
    html.match(/<img[^>]+src='([^']+)'[^>]+class='[^']*\btaaft_icon\b[^']*'/i)?.[1] ??
    null;
  return cleanUrl(overviewBlock);
}

function extractSectionParagraphs(html, sectionId) {
  const block =
    html.match(new RegExp(`id="${sectionId}"[\\s\\S]*?<\\/section>`, "i"))?.[0] ??
    html.match(new RegExp(`id='${sectionId}'[\\s\\S]*?<\\/section>`, "i"))?.[0] ??
    html.match(new RegExp(`id="${sectionId}"[\\s\\S]*?<\\/div>\\s*<\\/div>`, "i"))?.[0] ??
    html.match(new RegExp(`id='${sectionId}'[\\s\\S]*?<\\/div>\\s*<\\/div>`, "i"))?.[0] ??
    null;

  if (!block) return [];

  const paragraphs = [...block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(
    (match) => match[1] ?? "",
  );
  return uniqueParagraphs(paragraphs);
}

function mergeDescription(description, overviewParagraphs, releasesParagraphs) {
  const base = stripHtml(description);
  const sections = [];

  if (overviewParagraphs.length) {
    sections.push(`Overview: ${overviewParagraphs.join(" ")}`);
  }
  if (releasesParagraphs.length) {
    sections.push(`Releases: ${releasesParagraphs.join(" ")}`);
  }

  return [base, ...sections].filter(Boolean).join("\n\n");
}

async function main() {
  const snapshotRelativePath = process.argv[2];
  const reviewRelativePath = process.argv[3];
  if (!snapshotRelativePath || !reviewRelativePath) {
    throw new Error(
      "Usage: node scripts/auto-update/build-taaft-import-from-snapshot.mjs <snapshot-path> <review-dataset-path>",
    );
  }

  const workspaceRoot = rootDir();
  const snapshotPath = path.resolve(workspaceRoot, snapshotRelativePath);
  const reviewPath = path.resolve(workspaceRoot, reviewRelativePath);
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const reviewRecords = JSON.parse(readFileSync(reviewPath, "utf8"));

  const rawCandidates = snapshot.sources
    ?.flatMap((source) => ensureArray(source.candidates))
    .filter((candidate) => candidate?.sourceId === "taaft" && candidate?.isValid);

  const rawBySlug = new Map(rawCandidates.map((candidate) => [String(candidate.slug), candidate]));

  const importRecords = [];
  const enrichedRecords = [];

  for (const record of reviewRecords) {
    const raw = rawBySlug.get(String(record.slug));
    const sourceUrl = raw?.sourceUrl || record.source_url || null;
    let screenshotUrl = null;
    let detailLogoUrl = null;
    let overviewParagraphs = [];
    let releasesParagraphs = [];

    if (sourceUrl) {
      try {
        const html = await fetchText(sourceUrl);
        screenshotUrl = extractScreenshotUrl(html);
        detailLogoUrl = extractOverviewLogoUrl(html);
        overviewParagraphs = extractSectionParagraphs(html, "overview");
        releasesParagraphs = extractSectionParagraphs(html, "releases");
      } catch (error) {
        screenshotUrl = null;
        detailLogoUrl = null;
        overviewParagraphs = [];
        releasesParagraphs = [];
      }
    }

    const mergedDescription = mergeDescription(
      record.description,
      overviewParagraphs,
      releasesParagraphs,
    );

    const importRecord = {
      name: record.name,
      slug: record.slug,
      website: record.website,
      summary: record.summary,
      description: mergedDescription,
      pricingModel: toPricingModel(record.pricing),
      logoUrl: detailLogoUrl || record.logo_url || null,
      categorySlugs: ensureArray([record.primary_category_slug]).filter(Boolean),
      tags: ensureArray(record.tags),
      features: ensureArray(record.features),
      useCases: ensureArray(record.use_cases),
      seoTitle: record.seo_title,
      seoDescription: record.seo_description,
    };

    importRecords.push(importRecord);
    enrichedRecords.push({
      ...importRecord,
      sourceName: record.source_name,
      sourceUrl,
      screenshotUrl,
      overviewParagraphs,
      releasesParagraphs,
      logoXPath: LOGO_XPATH,
      screenshotXPath: SCREENSHOT_XPATH,
    });
  }

  const outputDir = path.join(workspaceRoot, "docs", "import");
  mkdirSync(outputDir, { recursive: true });
  const date = snapshot.date || new Date().toISOString().slice(0, 10);
  const importPath = path.join(outputDir, `taaft-import-records-${date}.json`);
  const enrichedPath = path.join(outputDir, `taaft-import-records-${date}.enriched.json`);

  writeFileSync(importPath, `${JSON.stringify({ records: importRecords }, null, 2)}\n`, "utf8");
  writeFileSync(enrichedPath, `${JSON.stringify(enrichedRecords, null, 2)}\n`, "utf8");

  console.info(`[taaft-import] snapshot=${path.relative(workspaceRoot, snapshotPath)}`);
  console.info(`[taaft-import] review=${path.relative(workspaceRoot, reviewPath)}`);
  console.info(`[taaft-import] import=${path.relative(workspaceRoot, importPath)}`);
  console.info(`[taaft-import] enriched=${path.relative(workspaceRoot, enrichedPath)}`);
  console.info(`[taaft-import] records=${importRecords.length}`);
}

main().catch((error) => {
  console.error(`[taaft-import] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
