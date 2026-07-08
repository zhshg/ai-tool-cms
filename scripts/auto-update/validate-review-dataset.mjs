import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_PRICING = new Set(["Free", "Freemium", "Paid", "Custom"]);

function rootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "../..");
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const relativePath = process.argv[2];
if (!relativePath) {
  throw new Error("Usage: node scripts/auto-update/validate-review-dataset.mjs <dataset-path>");
}

const workspaceRoot = rootDir();
const datasetPath = path.resolve(workspaceRoot, relativePath);
const records = JSON.parse(readFileSync(datasetPath, "utf8"));
const errors = [];
const slugSet = new Set();
const domainSet = new Set();

for (const record of records) {
  const label = record.slug || record.name;
  if (!record.name?.trim()) errors.push(`${label}: missing name`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) errors.push(`${label}: invalid slug`);
  if (slugSet.has(record.slug)) errors.push(`${label}: duplicate slug`);
  slugSet.add(record.slug);

  if (!/^https:\/\//.test(record.website)) errors.push(`${label}: website must be https`);
  const hostname = hostnameOf(record.website);
  if (!hostname) {
    errors.push(`${label}: invalid website`);
  } else {
    if (/aitoolsdirectory\.com$/i.test(hostname))
      errors.push(`${label}: website points to directory domain`);
    if (domainSet.has(hostname)) errors.push(`${label}: duplicate website domain`);
    domainSet.add(hostname);
  }

  if (!record.summary?.trim() || record.summary.length > 120)
    errors.push(`${label}: invalid summary length`);
  if (!record.description?.trim() || record.description.length < 120)
    errors.push(`${label}: description too short`);
  if (!record.primary_category_slug?.trim()) errors.push(`${label}: missing primary category slug`);
  if (!record.features?.length || record.features.length < 4)
    errors.push(`${label}: missing features`);
  if (!record.use_cases?.length || record.use_cases.length < 3)
    errors.push(`${label}: missing use cases`);
  if (!ALLOWED_PRICING.has(record.pricing)) errors.push(`${label}: invalid pricing`);
  if (!record.seo_title?.trim() || record.seo_title.length > 70)
    errors.push(`${label}: invalid seo_title`);
  if (!record.seo_description?.trim() || record.seo_description.length > 165)
    errors.push(`${label}: invalid seo_description`);
  if (record.logo_url && !/^https:\/\//.test(record.logo_url))
    errors.push(`${label}: invalid logo_url`);
}

if (errors.length > 0) {
  console.error(`[validate-review-dataset] failed with ${errors.length} error(s)`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.info(`[validate-review-dataset] ok: ${records.length} tools`);
}
