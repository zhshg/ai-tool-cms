import { MeiliSearch } from "meilisearch";
import { getEnv } from "@ai-tool-cms/config";
import type { SearchToolDocument } from "./types";

export const TOOLS_INDEX = "tools";

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
  const meili = getMeiliClient();
  if (!meili) return;

  try {
    await meili.getIndex(TOOLS_INDEX);
  } catch {
    await meili.createIndex(TOOLS_INDEX, { primaryKey: "id" });
  }

  const index = meili.index(TOOLS_INDEX);
  await index.updateSettings({
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
