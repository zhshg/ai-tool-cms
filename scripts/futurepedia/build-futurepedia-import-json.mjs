import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const STANDARD_AI_CATEGORIES = [
  { name: "AI Writing", slug: "ai-writing" },
  { name: "AI Chatbots", slug: "ai-chatbots" },
  { name: "AI Image", slug: "ai-image" },
  { name: "AI Video", slug: "ai-video" },
  { name: "AI Audio", slug: "ai-audio" },
  { name: "AI Coding", slug: "ai-coding" },
  { name: "AI SEO", slug: "ai-seo" },
  { name: "AI Marketing", slug: "ai-marketing" },
  { name: "AI Productivity", slug: "ai-productivity" },
  { name: "AI Design", slug: "ai-design" },
  { name: "AI Business", slug: "ai-business" },
  { name: "AI Research", slug: "ai-research" },
  { name: "AI Education", slug: "ai-education" },
  { name: "AI Agents", slug: "ai-agents" },
  { name: "AI Data", slug: "ai-data" },
  { name: "AI Presentation", slug: "ai-presentation" },
  { name: "AI Social Media", slug: "ai-social-media" },
  { name: "AI Customer Support", slug: "ai-customer-support" },
  { name: "AI Developer Tools", slug: "ai-developer-tools" },
  { name: "AI Automation", slug: "ai-automation" },
];

const CATEGORY_ALIAS_MAP = {
  "ai writing": "ai-writing",
  writing: "ai-writing",
  translation: "ai-writing",
  "ai chatbots": "ai-chatbots",
  chatbot: "ai-chatbots",
  chatbots: "ai-chatbots",
  "ai image": "ai-image",
  image: "ai-image",
  "image generation": "ai-image",
  "image-generation": "ai-image",
  "ai video": "ai-video",
  video: "ai-video",
  "ai audio": "ai-audio",
  audio: "ai-audio",
  "ai coding": "ai-coding",
  code: "ai-coding",
  coding: "ai-coding",
  "code assistant": "ai-coding",
  "ai seo": "ai-seo",
  seo: "ai-seo",
  "ai marketing": "ai-marketing",
  marketing: "ai-marketing",
  "ai productivity": "ai-productivity",
  productivity: "ai-productivity",
  "ai design": "ai-design",
  design: "ai-design",
  "ai business": "ai-business",
  business: "ai-business",
  sales: "ai-business",
  finance: "ai-business",
  legal: "ai-business",
  recruiting: "ai-business",
  ecommerce: "ai-business",
  "e commerce": "ai-business",
  "ai research": "ai-research",
  research: "ai-research",
  "ai education": "ai-education",
  education: "ai-education",
  "ai agents": "ai-agents",
  agents: "ai-agents",
  "ai data": "ai-data",
  data: "ai-data",
  "data analysis": "ai-data",
  "ai presentation": "ai-presentation",
  presentation: "ai-presentation",
  presentations: "ai-presentation",
  "ai social media": "ai-social-media",
  "social media": "ai-social-media",
  social: "ai-social-media",
  "ai customer support": "ai-customer-support",
  "customer support": "ai-customer-support",
  support: "ai-customer-support",
  "ai developer tools": "ai-developer-tools",
  "developer tools": "ai-developer-tools",
  developers: "ai-developer-tools",
  "ai automation": "ai-automation",
  automation: "ai-automation",
};

const CATEGORY_MAP = new Map(STANDARD_AI_CATEGORIES.map((item) => [item.slug, item]));

function readArgValue(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === name) return argv[index + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseStatus(value) {
  return value?.trim().toLowerCase() === "published" ? "Published" : "Draft";
}

function parseBooleanFlag(argv, name) {
  return argv.includes(name);
}

function parseArgs(argv) {
  return {
    input: readArgValue(argv, "--input"),
    out: readArgValue(argv, "--out"),
    limit: parseNumber(readArgValue(argv, "--limit")),
    status: parseStatus(readArgValue(argv, "--status")),
    existingTools: readArgValue(argv, "--existing-tools"),
    minConfidence: parseNumber(readArgValue(argv, "--min-confidence")),
    requireLogo: parseBooleanFlag(argv, "--require-logo"),
    requireScreenshots: parseBooleanFlag(argv, "--require-screenshots"),
  };
}

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

function normalizeAiCategoryKey(input) {
  return slugify(input).replace(/-/g, " ").trim();
}

function resolveCanonicalCategorySlug(input) {
  return CATEGORY_ALIAS_MAP[normalizeAiCategoryKey(input)] ?? null;
}

function getLatestFuturepediaExportFile(root) {
  const dir = path.join(root, "storage", "imports", "futurepedia");
  try {
    const files = readdirSync(dir)
      .filter((item) => /^futurepedia-all-tools-.*\.json$/i.test(item))
      .sort()
      .reverse();
    return files[0] ? path.join(dir, files[0]) : null;
  } catch {
    return null;
  }
}

function buildDefaultOutputPath(root) {
  return path.join(root, "storage", "imports", "futurepedia", "futurepedia-import-compatible.json");
}

function loadExistingToolsSnapshot(root, relativePath) {
  if (!relativePath) return null;
  const snapshotPath = path.resolve(root, relativePath);
  const payload = JSON.parse(readFileSync(snapshotPath, "utf8"));
  return {
    path: snapshotPath,
    payload,
    bySlug: new Map(payload.tools.map((tool) => [tool.slug.trim().toLowerCase(), tool])),
    byName: new Map(payload.tools.map((tool) => [tool.name.trim().toLowerCase(), tool])),
    byDomain: new Map(
      payload.tools
        .filter((tool) => tool.websiteDomain)
        .map((tool) => [String(tool.websiteDomain).toLowerCase(), tool]),
    ),
  };
}

function normalizeText(value) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncate(value, max) {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

function toSentence(value, fallback) {
  const text = normalizeText(value) || fallback;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function normalizeUrl(value) {
  const text = normalizeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function slugToWords(value) {
  return value
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function pickCategory(category) {
  const slug = category ? resolveCanonicalCategorySlug(category) : null;
  if (!slug) return null;
  return CATEGORY_MAP.get(slug) ?? null;
}

function inferPricing(tags, description) {
  const haystack = `${tags.join(" ")} ${description}`.toLowerCase();
  if (/\bfree\b/.test(haystack) && /\btrial\b/.test(haystack))
    return { label: "Freemium", model: "FREEMIUM" };
  if (/\bfree\b/.test(haystack) && /\bpaid\b/.test(haystack))
    return { label: "Freemium", model: "FREEMIUM" };
  if (/\bfree\b/.test(haystack) || /\bopen source\b/.test(haystack))
    return { label: "Free", model: "FREE" };
  if (
    /\benterprise\b/.test(haystack) ||
    /\bcontact\b/.test(haystack) ||
    /\bquote\b/.test(haystack)
  ) {
    return { label: "Contact", model: "CONTACT" };
  }
  if (
    /\bsubscription\b/.test(haystack) ||
    /\bpaid\b/.test(haystack) ||
    /\bpremium\b/.test(haystack)
  ) {
    return { label: "Paid", model: "PAID" };
  }
  return { label: "Freemium", model: "FREEMIUM" };
}

function buildFeatures(category, tags) {
  const topic = category.name.replace(/^AI\s+/i, "");
  const base = [
    `${topic} workflow support`,
    `Prompt-based ${topic.toLowerCase()} assistance`,
    "Template or guided task execution",
    "Web-based team-friendly access",
  ];
  const tagFeatures = tags.slice(0, 2).map((tag) => `${slugToWords(slugify(tag))} capabilities`);
  return [...new Set([...tagFeatures, ...base])].slice(0, 4);
}

function buildUseCases(name, category, tags) {
  const topic = category.name.replace(/^AI\s+/i, "").toLowerCase();
  const tagUseCases = tags
    .slice(0, 2)
    .map((tag) => `Using ${name} for ${tag.toLowerCase()} workflows`);
  return [...tagUseCases, `Daily ${topic} tasks`, `Team collaboration with ${name}`].slice(0, 4);
}

function buildAlternatives(name, category) {
  const fallbacks = {
    "ai-writing": ["Jasper", "Copy.ai", "Writesonic"],
    "ai-chatbots": ["ChatGPT", "Claude", "Gemini"],
    "ai-image": ["Midjourney", "Leonardo AI", "Ideogram"],
    "ai-video": ["Runway", "Pika", "Synthesia"],
    "ai-audio": ["ElevenLabs", "Suno", "Murf"],
    "ai-coding": ["Cursor", "GitHub Copilot", "Codeium"],
    "ai-seo": ["Surfer", "Frase", "Clearscope"],
    "ai-marketing": ["HubSpot AI", "Jasper", "Copy.ai"],
    "ai-productivity": ["Notion AI", "Mem", "Taskade"],
    "ai-design": ["Canva", "Figma AI", "Uizard"],
    "ai-business": ["Zapier", "Airtable AI", "ClickUp AI"],
    "ai-research": ["Perplexity", "Elicit", "Consensus"],
    "ai-education": ["Quizlet", "Khanmigo", "Socratic"],
    "ai-agents": ["AutoGen", "CrewAI", "LangGraph"],
    "ai-data": ["Akkio", "Rows AI", "Seek AI"],
    "ai-presentation": ["Gamma", "Tome", "Beautiful.ai"],
    "ai-social-media": ["Buffer AI", "Ocoya", "Predis.ai"],
    "ai-customer-support": ["Intercom", "Zendesk AI", "Forethought"],
    "ai-developer-tools": ["Postman", "LangSmith", "Replicate"],
    "ai-automation": ["Zapier", "Make", "n8n"],
  };

  return (fallbacks[category.slug] ?? ["ChatGPT", "Claude", "Gemini"])
    .filter((item) => item.toLowerCase() !== name.toLowerCase())
    .slice(0, 3);
}

function buildDescription(name, shortDescription, category, websiteDomain) {
  const categoryPhrase = category.name.toLowerCase();
  const intro = toSentence(
    shortDescription,
    `${name} is an ${categoryPhrase} tool for modern teams and independent professionals`,
  );
  const body = `${name} is listed on Futurepedia and is positioned for users who want practical ${categoryPhrase} workflows without heavy setup. It can fit content, operations, and experimentation needs depending on the team's process.`;
  const closing = websiteDomain
    ? `The official site is ${websiteDomain}, and the tool is best reviewed directly for current features, pricing, and product scope.`
    : "The tool should be reviewed on its official product site for current features, pricing, and product scope.";
  return `${intro} ${body} ${closing}`.trim();
}

function buildSeoTitle(name, category) {
  return truncate(`${name} - ${category.name} Tool`, 65);
}

function buildSeoDescription(name, category, alternatives) {
  const categoryPhrase = category.name.toLowerCase();
  const compare = alternatives.length > 0 ? ` Compare it with ${alternatives.join(", ")}.` : "";
  return truncate(
    `${name} is a ${categoryPhrase} platform for teams and creators. Explore features, pricing, use cases, and the best alternatives before you choose.${compare}`,
    160,
  );
}

function toImportRecord(tool, status) {
  if (!tool.isValid) return null;
  const websiteUrl = normalizeUrl(tool.officialWebsiteUrl);
  if (!websiteUrl) return null;
  const category = pickCategory(tool.category);
  if (!category) return null;

  const shortDescription = truncate(
    toSentence(
      tool.shortDescription,
      `${tool.name} helps users with ${category.name.toLowerCase()} workflows`,
    ),
    120,
  );
  const description = buildDescription(
    tool.name,
    tool.description ?? tool.shortDescription ?? shortDescription,
    category,
    extractDomain(websiteUrl),
  );
  const normalizedTags = [
    ...new Set((tool.tags ?? []).map((tag) => slugify(tag).replace(/-/g, " ")).filter(Boolean)),
  ];
  const tags = [
    ...new Set([...normalizedTags, category.slug.replace(/^ai-/, "ai "), "futurepedia"]),
  ].slice(0, 6);
  const pricing = inferPricing(tags, description);
  const features = buildFeatures(category, tags);
  const useCases = buildUseCases(tool.name, category, tags);
  const alternatives = buildAlternatives(tool.name, category);
  const seoTitle = buildSeoTitle(tool.name, category);
  const seoDescription = buildSeoDescription(tool.name, category, alternatives);
  const logoUrl = normalizeUrl(tool.logoUrl) ?? undefined;
  const screenshots = Array.isArray(tool.screenshots)
    ? tool.screenshots
        .map((item) => normalizeUrl(item))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    name: tool.name,
    slug: slugify(tool.slug || tool.name),
    website: websiteUrl,
    websiteUrl,
    ...(logoUrl ? { logoUrl } : {}),
    shortDescription,
    summary: shortDescription,
    description,
    category: category.slug,
    categorySlug: category.slug,
    categorySlugs: [category.slug],
    pricing: pricing.label,
    pricingModel: pricing.model,
    tags,
    features,
    useCases,
    alternatives,
    seoTitle,
    seoDescription,
    metaTitle: seoTitle,
    metaDescription: seoDescription,
    status,
    sourceUrl: tool.sourceUrl,
    ...(screenshots.length > 0 ? { screenshots } : {}),
  };
}

async function main() {
  const root = findWorkspaceRoot();
  const options = parseArgs(process.argv.slice(2));
  const inputPath = options.input
    ? path.resolve(root, options.input)
    : getLatestFuturepediaExportFile(root);
  if (!inputPath) {
    throw new Error("No Futurepedia export file found. Run futurepedia:export first.");
  }

  const outputPath = options.out ? path.resolve(root, options.out) : buildDefaultOutputPath(root);
  const payload = JSON.parse(readFileSync(inputPath, "utf8"));
  const report = {
    generatedAt: new Date().toISOString(),
    input: path.relative(root, inputPath),
    output: path.relative(root, outputPath),
    total: payload.tools.length,
    validInput: payload.tools.filter((item) => item.isValid).length,
    kept: 0,
    skippedInvalid: 0,
    skippedMissingWebsite: 0,
    skippedMissingCategory: 0,
    skippedDuplicateWebsite: 0,
    skippedDuplicateSlug: 0,
    skippedExistingSlug: 0,
    skippedExistingWebsite: 0,
    skippedExistingName: 0,
    skippedLowConfidence: 0,
    skippedMissingLogo: 0,
    skippedMissingScreenshots: 0,
  };
  const existingTools = loadExistingToolsSnapshot(root, options.existingTools);
  const seenSlugs = new Set();
  const seenDomains = new Set();
  const results = [];
  const sortedTools = [...payload.tools].sort(
    (left, right) => right.confidenceScore - left.confidenceScore,
  );

  for (const tool of sortedTools) {
    if (!tool.isValid) {
      report.skippedInvalid += 1;
      continue;
    }
    if (
      typeof options.minConfidence === "number" &&
      Number.isFinite(options.minConfidence) &&
      tool.confidenceScore < options.minConfidence
    ) {
      report.skippedLowConfidence += 1;
      continue;
    }
    if (options.requireLogo && !normalizeUrl(tool.logoUrl)) {
      report.skippedMissingLogo += 1;
      continue;
    }
    if (options.requireScreenshots) {
      const screenshots = Array.isArray(tool.screenshots)
        ? tool.screenshots.map((item) => normalizeUrl(item)).filter(Boolean)
        : [];
      if (screenshots.length === 0) {
        report.skippedMissingScreenshots += 1;
        continue;
      }
    }
    const category = pickCategory(tool.category);
    if (!category) {
      report.skippedMissingCategory += 1;
      continue;
    }
    const websiteUrl = normalizeUrl(tool.officialWebsiteUrl);
    if (!websiteUrl) {
      report.skippedMissingWebsite += 1;
      continue;
    }
    const record = toImportRecord(tool, options.status);
    if (!record) continue;
    const domain = extractDomain(record.websiteUrl);
    if (existingTools?.bySlug.get(record.slug.toLowerCase())) {
      report.skippedExistingSlug += 1;
      continue;
    }
    if (existingTools?.byName.get(record.name.trim().toLowerCase())) {
      report.skippedExistingName += 1;
      continue;
    }
    if (domain && existingTools?.byDomain.get(domain)) {
      report.skippedExistingWebsite += 1;
      continue;
    }
    if (seenSlugs.has(record.slug)) {
      report.skippedDuplicateSlug += 1;
      continue;
    }
    if (domain && seenDomains.has(domain)) {
      report.skippedDuplicateWebsite += 1;
      continue;
    }
    seenSlugs.add(record.slug);
    if (domain) seenDomains.add(domain);
    results.push(record);
    if (options.limit && results.length >= options.limit) break;
  }

  report.kept = results.length;
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  const reportPath = outputPath.replace(/\.json$/i, ".report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.info(`[futurepedia:build-import] input=${report.input}`);
  console.info(`[futurepedia:build-import] output=${report.output}`);
  console.info(`[futurepedia:build-import] kept=${report.kept}`);
  console.info(`[futurepedia:build-import] skippedInvalid=${report.skippedInvalid}`);
  console.info(`[futurepedia:build-import] skippedMissingWebsite=${report.skippedMissingWebsite}`);
  console.info(
    `[futurepedia:build-import] skippedMissingCategory=${report.skippedMissingCategory}`,
  );
  console.info(`[futurepedia:build-import] skippedDuplicateSlug=${report.skippedDuplicateSlug}`);
  console.info(
    `[futurepedia:build-import] skippedDuplicateWebsite=${report.skippedDuplicateWebsite}`,
  );
  console.info(`[futurepedia:build-import] skippedExistingSlug=${report.skippedExistingSlug}`);
  console.info(
    `[futurepedia:build-import] skippedExistingWebsite=${report.skippedExistingWebsite}`,
  );
  console.info(`[futurepedia:build-import] skippedExistingName=${report.skippedExistingName}`);
  console.info(`[futurepedia:build-import] skippedLowConfidence=${report.skippedLowConfidence}`);
  console.info(`[futurepedia:build-import] skippedMissingLogo=${report.skippedMissingLogo}`);
  console.info(
    `[futurepedia:build-import] skippedMissingScreenshots=${report.skippedMissingScreenshots}`,
  );
  console.info(`[futurepedia:build-import] report=${path.relative(root, reportPath)}`);
}

main().catch((error) => {
  console.error(
    `[futurepedia:build-import][error] ${error instanceof Error ? error.message : "unknown error"}`,
  );
  process.exitCode = 1;
});
