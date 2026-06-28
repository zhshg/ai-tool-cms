import type { SearchFilters } from "./types";

export function buildMeiliFilter(filters?: SearchFilters): string | undefined {
  if (!filters) return undefined;

  const clauses: string[] = [];

  const addIn = (field: string, value?: string | string[]) => {
    if (!value) return;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) return;
    const encoded = values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(", ");
    clauses.push(`${field} IN [${encoded}]`);
  };

  addIn("categorySlugs", filters.category);
  addIn("tagSlugs", filters.tag);
  addIn("pricingModel", filters.pricing);
  addIn("languages", filters.language);
  addIn("platforms", filters.platform);

  if (clauses.length === 0) return undefined;
  return clauses.join(" AND ");
}

export function normalizeFilters(filters?: SearchFilters): SearchFilters {
  if (!filters) return {};
  const norm = (v?: string | string[]) => {
    if (!v) return undefined;
    const list = (Array.isArray(v) ? v : [v]).map((x) => x.trim().toLowerCase()).filter(Boolean);
    return list.length === 1 ? list[0] : list.length > 1 ? list : undefined;
  };
  return {
    category: norm(filters.category),
    tag: norm(filters.tag),
    pricing: norm(filters.pricing),
    language: norm(filters.language),
    platform: norm(filters.platform),
  };
}
