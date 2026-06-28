import type { SeoHealthIssue, SeoHealthReport } from "../types";

export type SeoScoringInput = {
  pages: Array<{
    id: string;
    path: string;
    title?: string | null;
    metaDescription?: string | null;
    hasSchema?: boolean;
    wordCount?: number;
    statusCode?: number;
    aiQualityScore?: number | null;
    duplicateTitleGroup?: string;
  }>;
  indexStats?: { indexed: number; pending: number; excluded: number };
};

/**
 * Compute site-wide SEO health score (Commit 050).
 */
export function scoreSeoHealth(input: SeoScoringInput): SeoHealthReport {
  const issues: SeoHealthIssue[] = [];
  let missingMeta = 0;
  let missingSchema = 0;
  let duplicateTitles = 0;
  let brokenLinks = 0;
  let notFound404 = 0;
  let lowContent = 0;
  let aiQualityLow = 0;

  const titleGroups = new Map<string, number>();

  for (const page of input.pages) {
    if (!page.title || !page.metaDescription) {
      missingMeta += 1;
      issues.push({
        code: "MISSING_META",
        severity: "warning",
        message: "Missing title or meta description",
        path: page.path,
        entityId: page.id,
      });
    }

    if (!page.hasSchema) {
      missingSchema += 1;
      issues.push({
        code: "MISSING_SCHEMA",
        severity: "warning",
        message: "Missing JSON-LD schema",
        path: page.path,
        entityId: page.id,
      });
    }

    if (page.title) {
      const count = (titleGroups.get(page.title) ?? 0) + 1;
      titleGroups.set(page.title, count);
    }

    if ((page.wordCount ?? 0) < 120) {
      lowContent += 1;
      issues.push({
        code: "LOW_CONTENT",
        severity: "info",
        message: "Thin content page",
        path: page.path,
        entityId: page.id,
      });
    }

    if (page.statusCode === 404) {
      notFound404 += 1;
      issues.push({
        code: "NOT_FOUND",
        severity: "error",
        message: "Page returns 404",
        path: page.path,
        entityId: page.id,
      });
    }

    if (page.statusCode && page.statusCode >= 500) {
      brokenLinks += 1;
    }

    if (
      page.aiQualityScore !== null &&
      page.aiQualityScore !== undefined &&
      page.aiQualityScore < 80
    ) {
      aiQualityLow += 1;
      issues.push({
        code: "AI_QUALITY_LOW",
        severity: "warning",
        message: `AI quality score ${page.aiQualityScore} below threshold`,
        path: page.path,
        entityId: page.id,
      });
    }
  }

  for (const [title, count] of titleGroups) {
    if (count > 1) {
      duplicateTitles += count;
      issues.push({
        code: "DUPLICATE_TITLE",
        severity: "warning",
        message: `Duplicate title used ${count} times: ${title}`,
      });
    }
  }

  const pageCount = Math.max(input.pages.length, 1);
  const errorPenalty = (notFound404 + brokenLinks) * 8;
  const warningPenalty = (missingMeta + missingSchema + duplicateTitles) * 3;
  const infoPenalty = (lowContent + aiQualityLow) * 1;
  const score = Math.max(
    0,
    Math.min(100, 100 - errorPenalty - warningPenalty - infoPenalty / pageCount),
  );

  return {
    score: Math.round(score),
    indexStatus: input.indexStats ?? { indexed: 0, pending: 0, excluded: 0 },
    issues: issues.slice(0, 200),
    metrics: {
      missingMeta,
      missingSchema,
      duplicateTitles,
      brokenLinks,
      notFound404,
      lowContent,
      aiQualityLow,
    },
    generatedAt: new Date().toISOString(),
  };
}
