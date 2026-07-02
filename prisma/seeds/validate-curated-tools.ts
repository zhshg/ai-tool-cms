import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

type ToolRecord = {
  name: string;
  slug: string;
  website: string;
  summary: string;
  description: string;
  primary_category: string;
  secondary_categories?: string[];
  tags?: string[];
  pricing: string;
  features?: string[];
  use_cases?: string[];
  target_users?: string[];
  languages?: string[];
  platform?: string[];
  seo_title: string;
  seo_description: string;
};

const ALLOWED_CATEGORIES = new Set([
  "Writing",
  "Image",
  "Video",
  "Audio",
  "Code",
  "Productivity",
  "Marketing",
  "SEO",
  "Research",
  "Education",
  "Automation",
  "Business",
  "Design",
  "Data",
  "Sales",
  "Customer Support",
]);

const ALLOWED_PRICING = new Set(["Free", "Freemium", "Paid", "Custom", "Trial", "Open Source"]);

function loadDataset(): ToolRecord[] {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const filePath = path.resolve(currentDir, "../../docs/import/first-50-ai-tools.json");
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as ToolRecord[];
}

function normalizeWebsite(website: string): string {
  return website.trim().replace(/\/+$/, "").toLowerCase();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateDataset(tools: ToolRecord[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const websites = new Set<string>();

  if (tools.length !== 50) {
    errors.push(`Expected 50 tools but found ${tools.length}.`);
  }

  for (const tool of tools) {
    const label = tool.slug || tool.name || "unknown-tool";

    for (const [field, value] of Object.entries({
      name: tool.name,
      slug: tool.slug,
      website: tool.website,
      summary: tool.summary,
      description: tool.description,
      primary_category: tool.primary_category,
      pricing: tool.pricing,
      seo_title: tool.seo_title,
      seo_description: tool.seo_description,
    })) {
      if (!isNonEmptyString(value)) {
        errors.push(`${label}: missing required field ${field}`);
      }
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) {
      errors.push(`${label}: invalid slug format`);
    }

    if (slugs.has(tool.slug)) {
      errors.push(`${label}: duplicate slug`);
    }
    slugs.add(tool.slug);

    if (!/^https?:\/\//.test(tool.website)) {
      errors.push(`${label}: invalid website URL`);
    }

    const normalizedWebsite = normalizeWebsite(tool.website);
    if (websites.has(normalizedWebsite)) {
      errors.push(`${label}: duplicate website`);
    }
    websites.add(normalizedWebsite);

    if (!ALLOWED_CATEGORIES.has(tool.primary_category)) {
      errors.push(`${label}: invalid primary category ${tool.primary_category}`);
    }

    const secondaryCategories = tool.secondary_categories ?? [];
    const secondarySeen = new Set<string>();
    for (const category of secondaryCategories) {
      if (!ALLOWED_CATEGORIES.has(category)) {
        errors.push(`${label}: invalid secondary category ${category}`);
      }
      if (category === tool.primary_category) {
        errors.push(`${label}: primary category repeated in secondary_categories`);
      }
      if (secondarySeen.has(category)) {
        errors.push(`${label}: duplicate secondary category ${category}`);
      }
      secondarySeen.add(category);
    }

    const tagSeen = new Set<string>();
    for (const tag of tool.tags ?? []) {
      const normalizedTag = tag.trim().toLowerCase();
      if (!normalizedTag) {
        errors.push(`${label}: empty tag`);
      }
      if (tagSeen.has(normalizedTag)) {
        errors.push(`${label}: duplicate tag ${tag}`);
      }
      if (ALLOWED_CATEGORIES.has(tag)) {
        errors.push(`${label}: tag duplicates category ${tag}`);
      }
      tagSeen.add(normalizedTag);
    }

    if (!ALLOWED_PRICING.has(tool.pricing)) {
      errors.push(`${label}: invalid pricing ${tool.pricing}`);
    }

    if (tool.seo_title.length < 20 || tool.seo_title.length > 70) {
      errors.push(`${label}: seo_title length out of range`);
    }

    if (tool.seo_description.length < 80 || tool.seo_description.length > 180) {
      errors.push(`${label}: seo_description length out of range`);
    }

    if (tool.summary.length < 40 || tool.summary.length > 220) {
      errors.push(`${label}: summary length out of range`);
    }

    if (tool.description.length < 120 || tool.description.length > 4000) {
      errors.push(`${label}: description length out of range`);
    }
  }

  return errors;
}

function main(): void {
  const dataset = loadDataset();
  const errors = validateDataset(dataset);

  if (errors.length > 0) {
    console.error(`[validate-curated-tools] failed with ${errors.length} error(s)`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info(`[validate-curated-tools] ok: ${dataset.length} tools`);
}

main();
