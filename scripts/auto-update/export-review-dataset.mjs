import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCanonicalCategorySlug, slugify } from "@ai-tool-cms/common";
import { REVIEW_OVERRIDES } from "./review-overrides.mjs";

const CATEGORY_FEATURES = {
  "ai-writing": [
    "Draft content faster",
    "Rewrite existing copy",
    "Summarize long text",
    "Improve writing clarity",
  ],
  "ai-image": [
    "Generate visual assets",
    "Edit creative images",
    "Explore design concepts",
    "Speed up visual iteration",
  ],
  "ai-video": [
    "Create short videos",
    "Repurpose media content",
    "Improve visual storytelling",
    "Accelerate production workflows",
  ],
  "ai-audio": [
    "Generate or edit audio",
    "Transcribe spoken content",
    "Create voice assets",
    "Support audio production",
  ],
  "ai-coding": [
    "Speed up implementation",
    "Support debugging",
    "Improve developer workflows",
    "Assist with technical tasks",
  ],
  "ai-seo": [
    "Research search opportunities",
    "Track visibility signals",
    "Support optimization workflows",
    "Improve organic discovery",
  ],
  "ai-marketing": [
    "Create campaign assets",
    "Support growth workflows",
    "Speed up go-to-market work",
    "Improve audience reach",
  ],
  "ai-productivity": [
    "Reduce manual work",
    "Support daily planning",
    "Improve team execution",
    "Organize recurring tasks",
  ],
  "ai-design": [
    "Explore design directions",
    "Create interface assets",
    "Support creative iteration",
    "Translate ideas into visuals",
  ],
  "ai-business": [
    "Support business operations",
    "Reduce repetitive coordination",
    "Improve decision support",
    "Streamline internal workflows",
  ],
  "ai-research": [
    "Search and compare information",
    "Summarize findings",
    "Support analysis workflows",
    "Accelerate knowledge discovery",
  ],
  "ai-education": [
    "Create learning materials",
    "Support tutoring workflows",
    "Personalize study content",
    "Improve classroom prep",
  ],
  "ai-agents": [
    "Automate multi-step tasks",
    "Coordinate actions across tools",
    "Reduce manual orchestration",
    "Support autonomous workflows",
  ],
  "ai-data": [
    "Extract structured data",
    "Support analytics workflows",
    "Handle repetitive data tasks",
    "Improve data operations",
  ],
  "ai-presentation": [
    "Create presentation drafts",
    "Organize slides faster",
    "Support storytelling workflows",
    "Improve deck creation speed",
  ],
  "ai-social-media": [
    "Create social content",
    "Support channel growth",
    "Repurpose posts faster",
    "Improve audience engagement",
  ],
  "ai-customer-support": [
    "Support customer conversations",
    "Reduce repetitive responses",
    "Improve support workflows",
    "Help teams manage requests",
  ],
  "ai-developer-tools": [
    "Support engineering workflows",
    "Improve technical operations",
    "Speed up implementation",
    "Help developer teams ship faster",
  ],
  "ai-automation": [
    "Automate repetitive tasks",
    "Connect workflow steps",
    "Reduce manual operations",
    "Improve process consistency",
  ],
  "ai-chatbots": [
    "Handle conversational tasks",
    "Support user interactions",
    "Answer common questions",
    "Improve assistant workflows",
  ],
};

const CATEGORY_USE_CASES = {
  "ai-writing": ["Draft blog posts", "Rewrite marketing copy", "Summarize documents"],
  "ai-image": ["Generate campaign visuals", "Create concept art", "Edit promotional images"],
  "ai-video": ["Create short-form videos", "Repurpose product content", "Build visual explainers"],
  "ai-audio": ["Transcribe recordings", "Create voice content", "Edit spoken media"],
  "ai-coding": ["Prototype features", "Review code changes", "Debug implementation issues"],
  "ai-seo": ["Research keywords", "Track search visibility", "Plan optimization tasks"],
  "ai-marketing": ["Create landing copy", "Plan campaigns", "Support growth experiments"],
  "ai-productivity": ["Plan daily work", "Summarize meetings", "Organize recurring tasks"],
  "ai-design": ["Mock up interfaces", "Create design directions", "Build visual drafts"],
  "ai-business": ["Support operations", "Prepare internal documents", "Organize team workflows"],
  "ai-research": ["Explore topics", "Compare sources", "Summarize findings"],
  "ai-education": ["Build worksheets", "Create study resources", "Support lesson prep"],
  "ai-agents": [
    "Automate repetitive workflows",
    "Coordinate multi-step tasks",
    "Run assistant-driven actions",
  ],
  "ai-data": ["Collect structured data", "Organize analytics inputs", "Process recurring records"],
  "ai-presentation": ["Draft slide decks", "Organize narrative flow", "Prepare proposal visuals"],
  "ai-social-media": ["Create posts faster", "Track content ideas", "Improve engagement planning"],
  "ai-customer-support": [
    "Draft support replies",
    "Organize help content",
    "Handle repeated questions",
  ],
  "ai-developer-tools": [
    "Improve dev workflows",
    "Support tooling setup",
    "Streamline engineering tasks",
  ],
  "ai-automation": ["Connect routine tasks", "Reduce manual handoffs", "Automate workflow steps"],
  "ai-chatbots": [
    "Answer user questions",
    "Support website chat",
    "Handle assistant-style workflows",
  ],
};

function rootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "../..");
}

function toPricingLabel(pricingType) {
  switch (pricingType) {
    case "FREEMIUM":
      return "Freemium";
    case "PAID":
      return "Paid";
    case "CONTACT":
      return "Custom";
    default:
      return "Free";
  }
}

function unique(values) {
  return [...new Set(values)];
}

function toCategoryLabel(category) {
  return category.replace(/^AI\s+/i, "AI ");
}

function startsWithVowelSound(value) {
  return /^[aeiou]/i.test(value.trim());
}

function articleFor(value) {
  return startsWithVowelSound(value) ? "an" : "a";
}

function normalizeToolName(name) {
  return name
    .replace(/\s+AI Reviews:\s+Use Cases,\s+Pricing\s*&\s*Alternatives\s*$/i, "")
    .replace(/\s+Reviews:\s+Use Cases,\s+Pricing\s*&\s*Alternatives\s*$/i, "")
    .replace(/\s+\|\s+Hostinger$/i, "")
    .trim();
}

function normalizeLogoUrl(logoUrl) {
  if (!logoUrl) return null;
  try {
    const url = new URL(logoUrl);
    if (/futurepedia\.io$/i.test(url.hostname) && /^\/api\/og$/i.test(url.pathname)) {
      const image = url.searchParams.get("image");
      if (image) return image;
    }
    return url.toString();
  } catch {
    return logoUrl;
  }
}

function ensureSentence(value) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function polishSummary(summary, name) {
  let value = summary
    .replace(/^ai-powered tool\s+/i, "AI tool ")
    .replace(/^ai-powered\s+/i, "AI ")
    .replace(/^streamlines\s+/i, "Helps teams streamline ")
    .replace(/^unleash\s+/i, "Offers ")
    .replace(/^explore,\s*/i, "Explore ")
    .replace(/^turns\s+/i, "Turns ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^your\b/i.test(value)) {
    value = value.replace(/^your\s+/i, "Build ");
  }
  if (/^ai tool\b/i.test(value)) {
    value = value.replace(/^ai tool\s+delivers\b/i, "Delivers");
    value = value.replace(/^ai tool\b/i, "Helps teams");
  }
  value = value.replace(/^helps teams delivers\b/i, "Delivers");
  if (value.length > 120) {
    value = value.slice(0, 117).trimEnd() + "...";
  }
  return ensureSentence(value);
}

function buildDescription(name, summary, category) {
  const categoryLabel = toCategoryLabel(category);
  const lowerCategory = categoryLabel.toLowerCase();
  return [
    `${name} is ${articleFor(categoryLabel)} ${lowerCategory} tool built for practical workflows.`,
    summary,
    `It fits teams that want clearer outputs, faster execution, and a more reliable way to use AI in day-to-day work.`,
  ].join(" ");
}

function buildSeoTitle(name, category) {
  const categoryLabel = toCategoryLabel(category);
  const title = `${name} - ${categoryLabel} Tool`;
  return title.length <= 65 ? title : `${name} - AI Tool Review`;
}

function buildSeoDescription(name, summary, category) {
  const categoryLabel = toCategoryLabel(category);
  const raw = `${name} is ${articleFor(categoryLabel)} ${categoryLabel.toLowerCase()} tool for practical workflows. ${summary} Explore features, pricing, and common use cases.`;
  return raw.length <= 160
    ? raw
    : `${name} is ${articleFor(categoryLabel)} ${categoryLabel.toLowerCase()} tool for practical workflows. Explore features, pricing, and common use cases.`;
}

function inferPlatform(website) {
  try {
    const hostname = new URL(website).hostname.toLowerCase();
    if (/github\.com|huggingface\.co/.test(hostname)) return ["Web", "Open Source"];
    return ["Web"];
  } catch {
    return ["Web"];
  }
}

function getHostname(website) {
  try {
    return new URL(website).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isBlockedImportHost(hostname) {
  return /^(github\.com|huggingface\.co|reddit\.com|www\.reddit\.com|.*\.partnerlinks\.io|.*\.grsm\.io)$/i.test(
    hostname,
  );
}

function normalizeExportWebsite(website) {
  try {
    const url = new URL(website);
    const removableKeys = [...url.searchParams.keys()].filter((key) => {
      const normalized = key.toLowerCase();
      return (
        normalized.startsWith("utm_") ||
        normalized === "ref" ||
        normalized === "source" ||
        normalized === "campaign" ||
        normalized === "medium" ||
        normalized === "via" ||
        normalized === "fpr"
      );
    });
    for (const key of removableKeys) {
      url.searchParams.delete(key);
    }
    if (/pplx\.ai$/i.test(url.hostname) && /^\/futurepedia\/?$/i.test(url.pathname)) {
      url.pathname = "/";
    }
    if (/^partners\./i.test(url.hostname) && /(^|\.)browse\.ai$/i.test(url.hostname)) {
      url.hostname = "browse.ai";
      if (/^\/futurepedia\/?$/i.test(url.pathname)) {
        url.pathname = "/";
      }
    }
    return url.toString().replace(/\?$/, "").replace(/\/$/, "");
  } catch {
    return website;
  }
}

function candidatePriority(record) {
  const text = `${record.name} ${record.summary}`.toLowerCase();
  let score = Number(record.confidence_score ?? 0);
  if (/\b(ai|agent|assistant|generator|automation|chatbot)\b/.test(text)) score += 0.2;
  if (!/hostinger|github|hugging face/i.test(text)) score += 0.1;
  return score;
}

function clampSeoTitle(value) {
  return value.length <= 70 ? value : `${value.slice(0, 67).trim()}...`;
}

function clampSeoDescription(value) {
  return value.length <= 160 ? value : `${value.slice(0, 157).trim()}...`;
}

function mapDecisionToRecord(decision) {
  const { candidate } = decision;
  if (!candidate.websiteUrl || !candidate.category || !candidate.shortDescription) return null;

  const categorySlug = resolveCanonicalCategorySlug(candidate.category);
  if (!categorySlug) return null;

  const name = normalizeToolName(candidate.name);
  const summary = polishSummary(candidate.shortDescription.slice(0, 120), name);
  const description = buildDescription(name, summary, candidate.category);
  const features = CATEGORY_FEATURES[categorySlug] ?? [
    "Support practical workflows",
    "Reduce repetitive work",
    "Improve content quality",
    "Speed up execution",
  ];
  const useCases = CATEGORY_USE_CASES[categorySlug] ?? [
    "Support recurring tasks",
    "Improve workflow quality",
    "Save time on manual work",
  ];

  return {
    name,
    slug: slugify(name),
    website: normalizeExportWebsite(candidate.websiteUrl),
    logo_url: normalizeLogoUrl(candidate.logoUrl),
    summary,
    description,
    primary_category: candidate.category,
    primary_category_slug: categorySlug,
    tags: unique(candidate.tags).slice(0, 8),
    pricing: toPricingLabel(candidate.pricingType),
    features: features.slice(0, 4),
    use_cases: useCases.slice(0, 3),
    target_users: ["Knowledge Workers", "Teams", "Creators"],
    languages: ["English"],
    platform: inferPlatform(candidate.websiteUrl),
    seo_title: clampSeoTitle(buildSeoTitle(name, candidate.category)),
    seo_description: clampSeoDescription(buildSeoDescription(name, summary, candidate.category)),
    source_name: candidate.sourceName,
    source_url: candidate.sourceUrl,
    confidence_score: candidate.confidenceScore,
  };
}

const snapshotRelativePath = process.argv[2];
if (!snapshotRelativePath) {
  throw new Error("Usage: node scripts/auto-update/export-review-dataset.mjs <snapshot-path>");
}

const workspaceRoot = rootDir();
const snapshotPath = path.resolve(workspaceRoot, snapshotRelativePath);
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

const rawRecords = snapshot.decisions
  .filter((decision) => decision.status === "create")
  .map(mapDecisionToRecord)
  .filter(Boolean)
  .map((record) => {
    const override = REVIEW_OVERRIDES[record.name];
    if (!override) return record;
    return {
      ...record,
      ...override,
      slug: override.slug ?? record.slug,
      website: override.website ?? record.website,
      logo_url: override.logo_url ?? record.logo_url,
      summary: override.summary ?? record.summary,
      description: override.description ?? record.description,
      features: override.features ?? record.features,
      use_cases: override.use_cases ?? record.use_cases,
      seo_title: override.seo_title ?? record.seo_title,
      seo_description: override.seo_description ?? record.seo_description,
    };
  });

const recordByHostname = new Map();
for (const record of rawRecords) {
  const hostname = getHostname(record.website);
  if (!hostname || isBlockedImportHost(hostname)) continue;
  const existing = recordByHostname.get(hostname);
  if (!existing || candidatePriority(record) > candidatePriority(existing)) {
    recordByHostname.set(hostname, record);
  }
}

const records = [...recordByHostname.values()].sort((left, right) =>
  left.name.localeCompare(right.name),
);

const outputDir = path.join(workspaceRoot, "docs", "import");
mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `auto-discovered-tools-${snapshot.date}.json`);
writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");

console.info(`[export-review-dataset] snapshot=${path.relative(workspaceRoot, snapshotPath)}`);
console.info(`[export-review-dataset] output=${path.relative(workspaceRoot, outputPath)}`);
console.info(`[export-review-dataset] rawCount=${rawRecords.length}`);
console.info(`[export-review-dataset] filteredCount=${records.length}`);
