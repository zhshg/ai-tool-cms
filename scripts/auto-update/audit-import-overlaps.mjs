import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function rootDir() {
  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "../..");
}

function readJson(relativePath) {
  const workspaceRoot = rootDir();
  return JSON.parse(readFileSync(path.resolve(workspaceRoot, relativePath), "utf8"));
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const curated = readJson("docs/import/first-50-ai-tools.json");
const auto = readJson("docs/import/auto-discovered-tools-2026-07-08.json");

const curatedBySlug = new Map(curated.map((item) => [item.slug.toLowerCase(), item]));
const curatedByHost = new Map(curated.map((item) => [hostnameOf(item.website), item]));
const curatedByName = new Map(curated.map((item) => [item.name.toLowerCase(), item]));

const overlaps = [];

for (const item of auto) {
  const reasons = [];
  if (curatedBySlug.has(item.slug.toLowerCase())) reasons.push("slug");
  const host = hostnameOf(item.website);
  if (host && curatedByHost.has(host)) reasons.push("websiteHost");
  if (curatedByName.has(item.name.toLowerCase())) reasons.push("name");
  if (!reasons.length) continue;

  overlaps.push({
    name: item.name,
    slug: item.slug,
    website: item.website,
    reasons,
  });
}

console.info(
  `[audit-import-overlaps] curated=${curated.length} auto=${auto.length} overlaps=${overlaps.length}`,
);
console.info(JSON.stringify(overlaps, null, 2));
