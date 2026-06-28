import type { ToolDTO } from "./ToolDTO";

export type DuplicateCandidate = Pick<ToolDTO, "name" | "slug" | "website" | "domain" | "logoUrl">;

export type ExistingToolRecord = DuplicateCandidate & {
  id: string;
};

export type DuplicateMatch = {
  existingId: string;
  score: number;
  reasons: string[];
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  bestMatch?: DuplicateMatch;
};

export type DuplicateDetectorOptions = {
  /** Score threshold (0-1) to treat as duplicate. */
  threshold?: number;
};

/**
 * Composite duplicate detection by website, slug, domain, logo, and name (Commit 028).
 */
export class DuplicateDetector {
  constructor(private readonly options: DuplicateDetectorOptions = {}) {}

  check(candidate: DuplicateCandidate, existing: ExistingToolRecord[]): DuplicateCheckResult {
    const threshold = this.options.threshold ?? 0.72;
    let bestMatch: DuplicateMatch | undefined;

    for (const record of existing) {
      const match = this.score(candidate, record);
      if (match.score >= threshold && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = match;
      }
    }

    return {
      isDuplicate: Boolean(bestMatch),
      bestMatch,
    };
  }

  filterUnique(
    candidates: ToolDTO[],
    existing: ExistingToolRecord[],
  ): { unique: ToolDTO[]; duplicates: Array<{ dto: ToolDTO; match: DuplicateMatch }> } {
    const unique: ToolDTO[] = [];
    const duplicates: Array<{ dto: ToolDTO; match: DuplicateMatch }> = [];
    const seenInBatch = [...existing];

    for (const dto of candidates) {
      const result = this.check(dto, seenInBatch);
      if (result.isDuplicate && result.bestMatch) {
        duplicates.push({ dto, match: result.bestMatch });
        continue;
      }
      unique.push(dto);
      seenInBatch.push({ id: dto.externalId ?? dto.slug, ...dto });
    }

    return { unique, duplicates };
  }

  private score(candidate: DuplicateCandidate, existing: ExistingToolRecord): DuplicateMatch {
    const reasons: string[] = [];
    let score = 0;

    if (canonicalWebsite(candidate.website) === canonicalWebsite(existing.website)) {
      score += 0.45;
      reasons.push("website");
    }

    if (candidate.domain && candidate.domain === existing.domain) {
      score += 0.2;
      reasons.push("domain");
    }

    if (candidate.slug && existing.slug && candidate.slug === existing.slug) {
      score += 0.15;
      reasons.push("slug");
    }

    if (candidate.logoUrl && existing.logoUrl && candidate.logoUrl === existing.logoUrl) {
      score += 0.1;
      reasons.push("logo");
    }

    const nameSimilarity = stringSimilarity(candidate.name, existing.name);
    if (nameSimilarity >= 0.85) {
      score += 0.1 * nameSimilarity;
      reasons.push("name");
    }

    return { existingId: existing.id, score: Math.min(1, score), reasons };
  }
}

export const defaultDuplicateDetector = new DuplicateDetector();

function canonicalWebsite(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}

function stringSimilarity(a: string, b: string): number {
  const left = a.toLowerCase().trim();
  const right = b.toLowerCase().trim();
  if (left === right) return 1;
  if (!left || !right) return 0;
  const longer = left.length > right.length ? left : right;
  const shorter = left.length > right.length ? right : left;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  return 0;
}
