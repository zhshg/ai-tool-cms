import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { STANDARD_AI_CATEGORIES, resolveCanonicalCategorySlug } from "@ai-tool-cms/common";

type AutoDiscoveredToolRecord = {
  name: string;
  slug: string;
  website: string;
  summary: string;
  description: string;
  primary_category: string;
  primary_category_slug: string;
  pricing: string;
  seo_title: string;
  seo_description: string;
};

const ALLOWED_PRICING = new Set(["Free", "Freemium", "Paid", "Custom"]);

function datasetPath(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  return path.resolve(currentDir, "../../docs/import/auto-discovered-tools-2026-07-08.json");
}

function loadDataset(): AutoDiscoveredToolRecord[] {
  return JSON.parse(readFileSync(datasetPath(), "utf8")) as AutoDiscoveredToolRecord[];
}

function validateDataset(tools: AutoDiscoveredToolRecord[]): string[] {
  const errors: string[] = [];
  const slugSet = new Set<string>();
  const websiteSet = new Set<string>();
  const categorySet = new Set(STANDARD_AI_CATEGORIES.map((category) => category.slug));

  for (const tool of tools) {
    const label = tool.slug || tool.name || "unknown-tool";
    if (!tool.name?.trim()) errors.push(`${label}: missing name`);
    if (!tool.slug?.trim()) errors.push(`${label}: missing slug`);
    if (!tool.website?.trim()) errors.push(`${label}: missing website`);
    if (!tool.summary?.trim()) errors.push(`${label}: missing summary`);
    if (!tool.description?.trim()) errors.push(`${label}: missing description`);
    if (!tool.primary_category?.trim()) errors.push(`${label}: missing primary_category`);
    if (!tool.primary_category_slug?.trim()) errors.push(`${label}: missing primary_category_slug`);
    if (!tool.seo_title?.trim()) errors.push(`${label}: missing seo_title`);
    if (!tool.seo_description?.trim()) errors.push(`${label}: missing seo_description`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.slug)) errors.push(`${label}: invalid slug format`);
    if (slugSet.has(tool.slug)) errors.push(`${label}: duplicate slug`);
    slugSet.add(tool.slug);
    if (!/^https:\/\//.test(tool.website)) errors.push(`${label}: invalid website`);
    if (websiteSet.has(tool.website.toLowerCase())) errors.push(`${label}: duplicate website`);
    websiteSet.add(tool.website.toLowerCase());
    if (!ALLOWED_PRICING.has(tool.pricing)) errors.push(`${label}: invalid pricing`);
    if (resolveCanonicalCategorySlug(tool.primary_category) !== tool.primary_category_slug) {
      errors.push(`${label}: category mapping mismatch`);
    }
    if (!categorySet.has(tool.primary_category_slug)) {
      errors.push(`${label}: unknown primary category slug`);
    }
  }

  return errors;
}

function main(): void {
  const dataset = loadDataset();
  const errors = validateDataset(dataset);
  if (errors.length > 0) {
    console.error(`[validate-auto-discovered-tools] failed with ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.info(`[validate-auto-discovered-tools] ok: ${dataset.length} tools`);
}

main();
