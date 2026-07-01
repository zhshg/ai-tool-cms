import { MeiliSearch } from "meilisearch";
import { getEnv } from "@ai-tool-cms/config";
import type { SearchToolDocument } from "./types";

export const TOOLS_INDEX = "tools";
export const CATEGORIES_INDEX = "categories";
export const TAGS_INDEX = "tags";

let client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch | null {
  const env = getEnv();
  if (!env.MEILI_URL) return null;

  if (!client) {
    client = new MeiliSearch({
      host: env.MEILI_URL,
      apiKey: env.MEILI_MASTER_KEY,
    });
  }
  return client;
}

export function isMeiliConfigured(): boolean {
  return Boolean(getEnv().MEILI_URL);
}

export async function ensureToolsIndex(): Promise<void> {
  await ensureIndex(TOOLS_INDEX, "id", {
    searchableAttributes: [
      "name",
      "summary",
      "description",
      "searchableText",
      "categoryNames",
      "tagNames",
      "features",
      "useCases",
      "slug",
    ],
    filterableAttributes: ["categorySlugs", "tagSlugs", "pricingModel", "platforms", "languages"],
    sortableAttributes: ["popularityScore", "reviewScore", "publishedAt", "updatedAt"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
      "popularityScore:desc",
    ],
  });
}

export async function ensureCategoriesIndex(): Promise<void> {
  await ensureIndex(CATEGORIES_INDEX, "id", {
    searchableAttributes: ["name", "slug", "description", "searchableText"],
    filterableAttributes: ["parentId"],
    sortableAttributes: ["sortOrder", "updatedAt"],
  });
}

export async function ensureTagsIndex(): Promise<void> {
  await ensureIndex(TAGS_INDEX, "id", {
    searchableAttributes: ["name", "slug", "description", "searchableText"],
    sortableAttributes: ["updatedAt"],
  });
}

export async function ensureSearchIndexes(): Promise<void> {
  await Promise.all([ensureToolsIndex(), ensureCategoriesIndex(), ensureTagsIndex()]);
}

async function ensureIndex(
  indexName: string,
  primaryKey: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const meili = getMeiliClient();
  if (!meili) return;

  try {
    await meili.getIndex(indexName);
  } catch {
    const task = await meili.createIndex(indexName, { primaryKey });
    await meili.waitForTask(task.taskUid);
  }

  const task = await meili.index(indexName).updateSettings(settings);
  await meili.waitForTask(task.taskUid);
}

export async function upsertToolDocument(document: SearchToolDocument): Promise<void> {
  const meili = getMeiliClient();
  if (!meili) return;
  await ensureToolsIndex();
  await meili.index(TOOLS_INDEX).addDocuments([document]);
}

export async function deleteToolDocument(toolId: string): Promise<void> {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(TOOLS_INDEX).deleteDocument(toolId);
}
