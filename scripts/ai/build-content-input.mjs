import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const [key, inlineValue] = token.split("=", 2);
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else {
      args.set(key, "true");
    }
  }
  return args;
}

function getArg(args, name, fallback = "") {
  const value = args.get(name);
  return value === undefined ? fallback : value;
}

function boolArg(args, name, defaultValue = false) {
  const value = args.get(name);
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "";
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.tools)) return value.tools;
    if (Array.isArray(value.data)) return value.data;
  }
  return [];
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    const arrayStart = raw.indexOf("[");
    const arrayEnd = raw.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(raw.slice(arrayStart, arrayEnd + 1));
    }
    throw new Error("输入文件不是有效 JSON，也无法从日志中提取 JSON");
  }
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function stripHtml(value) {
  return normalizeText(String(value ?? "").replace(/<[^>]*>/g, " "));
}

function buildRecord(tool) {
  const name = normalizeText(tool.name);
  const slug = normalizeText(tool.slug);
  const summary = normalizeText(
    firstDefined(tool.summary, tool.shortDescription, tool.metaDescription),
  );
  const description = normalizeText(
    firstDefined(tool.description, tool.longDescription, tool.metaDescription, summary),
  );
  const logoUrl = normalizeText(
    firstDefined(tool.logoUrl, tool.logo, tool.image, tool.metadata?.logoUrl),
  );
  const website = normalizeText(
    firstDefined(tool.website, tool.officialWebsiteUrl, tool.websiteUrl),
  );
  const categories = normalizeList(
    (tool.categories?.map?.((item) => item?.category?.name || item?.category?.slug) ??
      tool.category)
      ? [tool.category]
      : [],
  );
  const tags = normalizeList(
    tool.tags?.map?.((item) => item?.tag?.name || item?.tag?.slug) ?? tool.tags,
  );
  const features = normalizeList(tool.features);
  const useCases = normalizeList(tool.useCases);
  const faqs = Array.isArray(tool.faqs) ? tool.faqs : [];
  const missing = [];
  if (!categories.length) missing.push("missing_category");
  if (tags.length < 3) missing.push("missing_tags");
  if (!logoUrl) missing.push("missing_logo");
  if (summary.length < 40) missing.push("weak_summary");
  if (description.length < 120) missing.push("weak_description");

  return {
    id: normalizeText(tool.id),
    name,
    slug,
    website,
    websiteDomain: normalizeText(firstDefined(tool.websiteDomain, tool.metadata?.websiteDomain)),
    summary: summary || stripHtml(description).slice(0, 180),
    description: stripHtml(description),
    longDescription: normalizeText(firstDefined(tool.longDescription, tool.description)),
    logoUrl,
    categories,
    tags,
    features: features.slice(0, 8),
    useCases: useCases.slice(0, 6),
    faqs: faqs.slice(0, 6),
    status: normalizeText(tool.status || "PUBLISHED"),
    metadata: {
      source: normalizeText(firstDefined(tool.source, tool.metadata?.source, "unknown")),
      sourceUrl: normalizeText(firstDefined(tool.sourceUrl, tool.metadata?.sourceUrl)),
      sourceSlug: normalizeText(firstDefined(tool.sourceSlug, tool.metadata?.sourceSlug, slug)),
    },
    missing,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), getArg(args, "--input"));
  const outputPath = path.resolve(process.cwd(), getArg(args, "--output", "your-tools.json"));
  const limit = Number(getArg(args, "--limit", "0"));
  const onlyMissing = boolArg(args, "--only-missing", true);

  if (!inputPath) {
    throw new Error("Missing --input path");
  }

  const raw = await readFile(inputPath, "utf8");
  const payload = tryParseJson(raw);
  const items = toArray(payload);

  if (!items.length) {
    throw new Error("输入文件中没有找到 tools/items/data 数组");
  }

  const records = items.map(buildRecord);
  const filtered = onlyMissing ? records.filter((item) => item.missing.length > 0) : records;
  const limited = limit > 0 ? filtered.slice(0, limit) : filtered;

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: inputPath,
    total: items.length,
    selected: limited.length,
    onlyMissing,
    items: limited,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({ outputPath, total: items.length, selected: limited.length }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
