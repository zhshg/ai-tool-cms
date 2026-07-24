import { PrismaClient } from "../../packages/database/generated/client/index.js";

const prisma = new PrismaClient();

const HTML_TAG_PATTERN = /<[^>]*>/g;
const BLOCK_BREAK_PATTERN = /<\/(p|div|li|h\d|blockquote|section|article)>|<br\s*\/?>/gi;
const MULTIPLE_NEWLINES_PATTERN = /\n{3,}/g;
const MULTIPLE_SPACES_PATTERN = /[ \t]+/g;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const tools = await prisma.tool.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      description: true,
      longDescription: true,
      metaTitle: true,
      metaDescription: true,
      metadata: true,
      status: true,
    },
  });

  let updated = 0;
  let changedHtml = 0;
  let filledMissing = 0;
  let normalizedMeta = 0;

  for (const tool of tools) {
    const nextSummary = normalizeText(tool.summary);
    const nextDescription = normalizeText(tool.description);
    const nextLongDescription = normalizeLongText(tool.longDescription ?? tool.description);
    const nextMetaTitle = normalizeText(tool.metaTitle);
    const nextMetaDescription = normalizeMetaDescription(
      tool.metaDescription ?? tool.summary ?? tool.description,
    );

    const nextMetadata = cleanMetadata(tool.metadata);

    const data = {};
    const changes = [];

    if (nextSummary !== tool.summary) {
      data.summary = nextSummary;
      changes.push("summary");
    }
    if (nextDescription !== tool.description) {
      data.description = nextDescription;
      changes.push("description");
      changedHtml += 1;
    }
    if (nextLongDescription !== tool.longDescription) {
      data.longDescription = nextLongDescription;
      changes.push("longDescription");
      changedHtml += 1;
    }
    if (nextMetaTitle !== tool.metaTitle) {
      data.metaTitle = nextMetaTitle;
      changes.push("metaTitle");
    }
    if (nextMetaDescription !== tool.metaDescription) {
      data.metaDescription = nextMetaDescription;
      changes.push("metaDescription");
      normalizedMeta += 1;
    }
    if (!isSameJson(nextMetadata, tool.metadata)) {
      data.metadata = nextMetadata;
      changes.push("metadata");
    }

    if (!tool.summary && nextSummary) filledMissing += 1;
    if (!tool.description && nextDescription) filledMissing += 1;
    if (!tool.longDescription && nextLongDescription) filledMissing += 1;

    if (changes.length === 0) continue;
    updated += 1;

    if (!dryRun) {
      await prisma.tool.update({
        where: { id: tool.id },
        data,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        total: tools.length,
        updated,
        changedHtml,
        filledMissing,
        normalizedMeta,
      },
      null,
      2,
    ),
  );
}

function normalizeText(value) {
  const text = cleanText(value);
  return text || null;
}

function normalizeLongText(value) {
  const text = cleanText(value);
  return text || null;
}

function normalizeMetaDescription(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text.slice(0, 320).trim();
}

function cleanMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata ?? {};
  const next = { ...metadata };
  for (const key of ["collectedLogoUrl", "logoUrl", "logo", "svgLogoUrl", "officialLogoUrl"]) {
    if (typeof next[key] === "string" && isAITopToolsLogo(next[key])) {
      next[key] = null;
    }
  }
  return next;
}

function isSameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return decodeHtmlEntities(
    value
      .replace(BLOCK_BREAK_PATTERN, "\n")
      .replace(HTML_TAG_PATTERN, "")
      .replace(/\r\n?/g, "\n")
      .replace(MULTIPLE_NEWLINES_PATTERN, "\n\n")
      .replace(MULTIPLE_SPACES_PATTERN, " ")
      .trim(),
  );
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isAITopToolsLogo(value) {
  return String(value || "").includes("aitoptool-logo-black.png");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
