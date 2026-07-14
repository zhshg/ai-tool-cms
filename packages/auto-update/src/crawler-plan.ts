import { createHash } from "node:crypto";
import * as commonPkg from "@ai-tool-cms/common";
import { PricingModel, ToolStatus } from "@ai-tool-cms/database";
import type {
  CandidateDraft,
  CrawlerImportOptions,
  CrawlerPlanDecision,
  CrawlerPlanResult,
  ExistingCategoryLite,
  ExistingToolLite,
  PlannedCrawlerTool,
} from "./types";
import { getRegistrableDomain, normalizeWebsiteUrl, similarity } from "./utils";

const { resolveCanonicalCategorySlug, slugify } = commonPkg;

type PlanCrawlerImportsInput = {
  candidates: CandidateDraft[];
  existingTools: ExistingToolLite[];
  categories: ExistingCategoryLite[];
  options: CrawlerImportOptions;
};

type DuplicateMatch = {
  tool: ExistingToolLite;
  reasons: string[];
};

const REQUIRED_MIN_DESCRIPTION = 260;

export function planCrawlerImports(input: PlanCrawlerImportsInput): CrawlerPlanResult {
  const categoriesBySlug = new Map(
    input.categories.map((category) => [category.slug.toLowerCase(), category]),
  );
  const usedSlugs = new Set(input.existingTools.map((tool) => tool.slug.toLowerCase()));
  const decisions: CrawlerPlanDecision[] = [];
  let fallbackCategoryCount = 0;
  let suspectedFakeUrlCount = 0;
  let duplicateCount = 0;
  let missingFieldCount = 0;

  for (const candidate of input.candidates) {
    const warnings = [...candidate.warnings];
    const validationErrors = [...candidate.validationErrors];
    const duplicate = findDuplicate(candidate, input.existingTools);
    const categoryMatch = resolveCategory(
      candidate,
      categoriesBySlug,
      input.options.categoryFallbackSlug,
    );
    const rootDomain = getRegistrableDomain(candidate.websiteUrl) ?? "";
    const suspectedFakeUrl = isSuspectedFakeUrl(candidate.websiteUrl);

    if (!candidate.name.trim()) validationErrors.push("name is required");
    if (!candidate.websiteUrl) validationErrors.push("websiteUrl is required");
    if (suspectedFakeUrl) {
      validationErrors.push("websiteUrl looks suspicious");
      suspectedFakeUrlCount += 1;
    }

    if (!categoryMatch) {
      validationErrors.push("category is missing");
    } else if (categoryMatch.fallbackApplied) {
      warnings.push("category fallback applied");
      fallbackCategoryCount += 1;
    }

    const normalized = buildNormalizedTool({
      candidate,
      rootDomain,
      category: categoryMatch,
      existingTools: input.existingTools,
      usedSlugs,
      skipLogo: input.options.skipLogo,
      defaultStatus: input.options.defaultStatus,
    });

    if (!normalized.summary) validationErrors.push("summary is required");
    if (!normalized.description) validationErrors.push("description is required");
    if (!normalized.tags.length) validationErrors.push("tags are required");

    const updateFields = duplicate
      ? computeSafeUpdateFields(duplicate.tool, normalized, input.options.defaultStatus)
      : [];

    let action: CrawlerPlanDecision["action"] = "create";
    const duplicateReasons = duplicate?.reasons ?? [];

    if (duplicate) {
      duplicateCount += 1;
      if (input.options.updateExisting && updateFields.length > 0) {
        action = "update";
      } else {
        action = "skip";
      }
    }

    if (validationErrors.length > 0) {
      missingFieldCount += 1;
      action = "skip";
    }

    decisions.push({
      candidate,
      action,
      matchedToolId: duplicate?.tool.id ?? null,
      matchedToolSlug: duplicate?.tool.slug ?? null,
      normalized,
      updateFields,
      duplicateReasons,
      validationErrors: uniqueList(validationErrors),
      warnings: uniqueList(warnings),
      suspectedFakeUrl,
    });
  }

  return {
    decisions,
    summary: {
      totalFetched: input.candidates.length,
      planCreateCount: decisions.filter((item) => item.action === "create").length,
      planUpdateCount: decisions.filter((item) => item.action === "update").length,
      skipCount: decisions.filter((item) => item.action === "skip").length,
      duplicateCount,
      fallbackCategoryCount,
      missingFieldCount,
      suspectedFakeUrlCount,
      sampleCount: Math.min(10, decisions.length),
    },
  };
}

function buildNormalizedTool(input: {
  candidate: CandidateDraft;
  rootDomain: string;
  category: {
    category: ExistingCategoryLite;
    fallbackApplied: boolean;
  } | null;
  existingTools: ExistingToolLite[];
  usedSlugs: Set<string>;
  skipLogo: boolean;
  defaultStatus: ToolStatus;
}): PlannedCrawlerTool {
  const category = input.category?.category ?? {
    id: "",
    slug: "",
    name: "",
  };
  const summary = truncate(
    input.candidate.shortDescription ?? input.candidate.description ?? "",
    120,
  );
  const tags = ensureTagList(input.candidate.tags, input.candidate.name, category.slug);
  const description = buildLongDescription(
    input.candidate.name,
    summary,
    input.candidate.description,
    category.name || "AI tool",
    input.candidate.pricingType,
    tags,
  );
  const baseSlug = slugify(
    input.candidate.slug || input.candidate.name || input.rootDomain || "ai-tool",
  );
  const slug = resolveUniqueSlug(
    baseSlug,
    input.candidate.websiteUrl,
    input.existingTools,
    input.usedSlugs,
  );
  input.usedSlugs.add(slug.toLowerCase());
  const metaTitle = buildSeoTitle(input.candidate.name, category.name || "AI Tool");
  const metaDescription = buildSeoDescription(
    input.candidate.name,
    summary,
    category.name || "AI Tool",
  );

  return {
    sourceId: input.candidate.sourceId,
    sourceName: input.candidate.sourceName,
    sourceUrl: input.candidate.sourceUrl,
    externalId: input.candidate.externalId,
    name: input.candidate.name.trim(),
    slug,
    website: normalizeWebsiteUrl(input.candidate.websiteUrl ?? "") ?? "",
    rootDomain: input.rootDomain,
    summary,
    description,
    logoUrl: input.skipLogo ? null : input.candidate.logoUrl,
    pricingModel: input.candidate.pricingType ?? PricingModel.FREE,
    status: input.defaultStatus,
    metaTitle,
    metaDescription,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    tags,
    metadata: {
      ...(input.candidate.metadata ?? {}),
      crawler: {
        ...((input.candidate.metadata?.crawler as Record<string, unknown> | undefined) ?? {}),
        sourceId: input.candidate.sourceId,
        sourceName: input.candidate.sourceName,
        sourceUrl: input.candidate.sourceUrl,
        externalId: input.candidate.externalId,
        importedAt: new Date().toISOString(),
      },
      sourceCategory: input.candidate.category,
      sourceTags: input.candidate.tags,
    },
  };
}

function resolveCategory(
  candidate: CandidateDraft,
  categoriesBySlug: Map<string, ExistingCategoryLite>,
  fallbackSlug: string | null,
) {
  const direct = candidate.category ? resolveCanonicalCategorySlug(candidate.category) : null;
  if (direct) {
    const existing = categoriesBySlug.get(direct.toLowerCase());
    if (existing) {
      return { category: existing, fallbackApplied: false };
    }
  }

  if (fallbackSlug) {
    const fallback = categoriesBySlug.get(fallbackSlug.toLowerCase());
    if (fallback) {
      return { category: fallback, fallbackApplied: true };
    }
  }

  return null;
}

function findDuplicate(
  candidate: CandidateDraft,
  existingTools: ExistingToolLite[],
): DuplicateMatch | null {
  const candidateWebsite = normalizeWebsiteUrl(candidate.websiteUrl ?? "");
  const candidateSlug = slugify(candidate.slug || candidate.name);
  const candidateDomain = getRegistrableDomain(candidateWebsite);

  for (const tool of existingTools) {
    const reasons: string[] = [];
    const existingWebsite = normalizeWebsiteUrl(tool.website);
    const existingDomain = getRegistrableDomain(existingWebsite);
    const nameScore = similarity(candidate.name, tool.name);

    if (candidateWebsite && existingWebsite && candidateWebsite === existingWebsite) {
      reasons.push("website match");
    }
    if (
      candidateSlug &&
      candidateSlug === tool.slug &&
      (nameScore >= 0.85 || candidateDomain === existingDomain)
    ) {
      reasons.push("slug match");
    }
    if (nameScore >= 0.96) {
      reasons.push("name match");
    }
    if (
      candidateDomain &&
      existingDomain &&
      candidateDomain === existingDomain &&
      nameScore >= 0.8
    ) {
      reasons.push("domain and name match");
    }

    if (reasons.length > 0) {
      return { tool, reasons };
    }
  }

  return null;
}

function computeSafeUpdateFields(
  existing: ExistingToolLite,
  normalized: PlannedCrawlerTool,
  defaultStatus: ToolStatus,
) {
  const fields: string[] = [];
  if (!existing.logoUrl && normalized.logoUrl) fields.push("logoUrl");
  if (!existing.summary && normalized.summary) fields.push("summary");
  if (!existing.description && normalized.description) fields.push("description");
  if (existing.tagNames.length === 0 && normalized.tags.length > 0) fields.push("tags");
  if (existing.categorySlugs.length === 0 && normalized.categoryId) fields.push("category");
  if (!existing.metaTitle && normalized.metaTitle) fields.push("metaTitle");
  if (!existing.metaDescription && normalized.metaDescription) {
    fields.push("metaDescription");
  }
  if (existing.status !== defaultStatus && existing.status !== ToolStatus.PUBLISHED)
    fields.push("status");
  return fields;
}

function resolveUniqueSlug(
  baseSlug: string,
  websiteUrl: string | null,
  existingTools: ExistingToolLite[],
  usedSlugs: Set<string>,
) {
  const normalizedBase = baseSlug || "ai-tool";
  if (!usedSlugs.has(normalizedBase.toLowerCase())) return normalizedBase;

  const sameSlugTool = existingTools.find(
    (tool) => tool.slug.toLowerCase() === normalizedBase.toLowerCase(),
  );
  const existingDomain = sameSlugTool ? getRegistrableDomain(sameSlugTool.website) : null;
  const candidateDomain = getRegistrableDomain(websiteUrl);

  if (sameSlugTool && candidateDomain && existingDomain && candidateDomain === existingDomain) {
    return normalizedBase;
  }

  const suffix = createHash("sha1")
    .update(`${websiteUrl ?? normalizedBase}`)
    .digest("hex")
    .slice(0, 4);
  return `${normalizedBase}-${suffix}`;
}

function buildLongDescription(
  name: string,
  summary: string,
  description: string | null,
  categoryName: string,
  pricingModel: PricingModel,
  tags: string[],
) {
  const seed = description?.trim() || summary.trim();
  const sentences = [
    `${name} is a ${categoryName.toLowerCase()} tool designed for teams and solo users who need practical AI support in daily workflows.`,
    seed.endsWith(".") ? seed : `${seed}.`,
    `${name} is currently cataloged with a ${pricingModel.toLowerCase()} pricing model and is grouped under ${categoryName.toLowerCase()} on toolsdar.io.`,
    tags.length
      ? `Common use cases include ${tags.slice(0, 3).join(", ")}, making it easier to compare with similar tools in the same category.`
      : `It is prepared for comparison against similar tools in the same category with clean metadata, taxonomy links, and search-ready content.`,
  ];

  let combined = sentences.join(" ");
  if (combined.length < REQUIRED_MIN_DESCRIPTION) {
    combined += ` The listing keeps the copy concise, original, and suitable for directory pages, while preserving enough detail for search, category pages, and admin review workflows.`;
  }
  return combined.slice(0, 800);
}

function buildSeoTitle(name: string, categoryName: string) {
  return truncate(`${name} Review & Alternatives | ${categoryName}`, 60);
}

function buildSeoDescription(name: string, summary: string, categoryName: string) {
  const base = `${name} is listed in ${categoryName}. ${summary}`;
  return truncate(base, 160);
}

function ensureTagList(tags: string[], name: string, categorySlug: string) {
  const normalized = new Set<string>();
  for (const tag of tags) {
    const value = slugify(tag).replace(/-/g, " ").trim();
    if (value) normalized.add(value);
  }

  const fallback = [
    "ai",
    categorySlug.replace(/^ai-/, "").replace(/-/g, " ").trim(),
    ...name
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((item) => item.length >= 4)
      .slice(0, 2),
  ];

  for (const item of fallback) {
    if (normalized.size >= 3) break;
    if (item) normalized.add(item);
  }

  return [...normalized].slice(0, 8);
}

function isSuspectedFakeUrl(value: string | null) {
  if (!value) return true;
  return /example\.com|futurepedia\.io|theresanaiforthat\.com|toolify\.ai|aitoolsdirectory\.com/i.test(
    value,
  );
}

function uniqueList(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd() + "...";
}
