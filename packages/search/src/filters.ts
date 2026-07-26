import type { SearchFilters } from "./types";

function encodeValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function buildMeiliFilter(filters?: SearchFilters): string | undefined {
  if (!filters) return undefined;

  const clauses: string[] = [];

  const addIn = (field: string, value?: string | string[]) => {
    if (!value) return;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) return;
    clauses.push(`${field} IN [${values.map(encodeValue).join(", ")}]`);
  };

  const addBoolean = (field: string, value?: boolean) => {
    if (value === true) clauses.push(`${field} = true`);
  };

  addIn("categorySlugs", filters.category);
  addIn("tagSlugs", filters.tag);
  addIn("pricingModel", filters.pricing);
  addIn("languages", filters.language);
  addIn("platforms", filters.platform);
  addBoolean("hasApi", filters.api);
  addBoolean("isFree", filters.free);
  addBoolean("isOpenSource", filters.openSource);

  if (clauses.length === 0) return undefined;
  return clauses.join(" AND ");
}

export function normalizeFilters(filters?: SearchFilters): SearchFilters {
  if (!filters) return {};
  const norm = (value?: string | string[]) => {
    if (!value) return undefined;
    const list = (Array.isArray(value) ? value : [value])
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length === 1 ? list[0] : list.length > 1 ? list : undefined;
  };

  return {
    category: norm(filters.category),
    tag: norm(filters.tag),
    pricing: norm(filters.pricing),
    language: norm(filters.language),
    platform: norm(filters.platform),
    api: filters.api === true ? true : undefined,
    free: filters.free === true ? true : undefined,
    openSource: filters.openSource === true ? true : undefined,
  };
}
