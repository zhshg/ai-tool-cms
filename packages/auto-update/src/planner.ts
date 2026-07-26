import { ToolStatus } from "@ai-tool-cms/database";
import type {
  AutoUpdateMode,
  AutoUpdateSummary,
  CandidateDecision,
  CandidateDraft,
  ExistingToolLite,
} from "./types";
import { getRegistrableDomain, similarity } from "./utils";

function matchExisting(candidate: CandidateDraft, existingTools: ExistingToolLite[]) {
  const candidateDomain = getRegistrableDomain(candidate.websiteUrl);
  let bestNameMatch: ExistingToolLite | null = null;
  let bestNameScore = 0;

  for (const tool of existingTools) {
    const autoUpdate = (tool.metadata.autoUpdate ?? {}) as Record<string, unknown>;
    if (typeof autoUpdate.sourceUrl === "string" && autoUpdate.sourceUrl === candidate.sourceUrl) {
      return { tool, reason: "duplicate sourceUrl", hardDuplicate: true };
    }
    if (tool.slug === candidate.slug) {
      return { tool, reason: "duplicate slug", hardDuplicate: true };
    }
    if (candidateDomain && getRegistrableDomain(tool.website) === candidateDomain) {
      return { tool, reason: "duplicate website domain", hardDuplicate: true };
    }
    const score = similarity(candidate.name, tool.name);
    if (score > bestNameScore) {
      bestNameScore = score;
      bestNameMatch = tool;
    }
  }

  if (bestNameMatch && bestNameScore >= 0.8) {
    return { tool: bestNameMatch, reason: "similar name requires review", hardDuplicate: false };
  }

  return null;
}

function getUpdateFields(candidate: CandidateDraft, existing: ExistingToolLite): string[] {
  const fields: string[] = [];
  if (!existing.logoUrl && candidate.logoUrl) fields.push("logoUrl");
  if (!existing.summary && candidate.shortDescription) fields.push("summary");
  if (!existing.description && candidate.description) fields.push("description");
  if (!existing.tagNames.length && candidate.tags.length) fields.push("tags");
  return fields;
}

export function planCandidates(input: {
  mode: AutoUpdateMode;
  dailyLimit: number;
  minConfidence: number;
  candidates: CandidateDraft[];
  existingTools: ExistingToolLite[];
}): { decisions: CandidateDecision[]; summary: AutoUpdateSummary } {
  const decisions: CandidateDecision[] = [];
  const seenSourceUrls = new Set<string>();
  const seenSlugs = new Set<string>();
  let publishedBudget = input.dailyLimit;

  for (const candidate of input.candidates) {
    const reasons: string[] = [];
    let status: CandidateDecision["status"] = "skip";
    let publish = false;
    let matchedToolId: string | null = null;
    let matchedToolSlug: string | null = null;
    let updateFields: string[] = [];

    if (seenSourceUrls.has(candidate.sourceUrl)) reasons.push("duplicate sourceUrl in current batch");
    if (seenSlugs.has(candidate.slug)) reasons.push("duplicate slug in current batch");
    if (!candidate.isValid) reasons.push(...candidate.validationErrors);

    const matched = matchExisting(candidate, input.existingTools);
    if (matched) {
      matchedToolId = matched.tool.id;
      matchedToolSlug = matched.tool.slug;
      reasons.push(matched.reason);
      updateFields = getUpdateFields(candidate, matched.tool);
    }

    if (candidate.confidenceScore < input.minConfidence) {
      reasons.push("below minimum confidence threshold");
    }

    if (!reasons.length && !matched) {
      status = "create";
      if (input.mode === "safe-auto" && publishedBudget > 0) {
        publish = true;
        publishedBudget -= 1;
      }
    } else if (matched && updateFields.length) {
      status = input.mode === "safe-auto" ? "skip" : "update-empty";
      if (input.mode === "safe-auto") {
        reasons.push("safe-auto forbids updating existing tools");
      }
    } else if (candidate.confidenceScore < input.minConfidence && input.mode !== "safe-auto") {
      status = "draft";
    }

    if (input.mode === "full-auto") {
      reasons.push("full-auto reserved for future phase");
      publish = false;
      if (status === "create") status = "draft";
    }

    decisions.push({
      candidate,
      status,
      publish,
      matchedToolId,
      matchedToolSlug,
      updateFields,
      reasons,
    });

    seenSourceUrls.add(candidate.sourceUrl);
    seenSlugs.add(candidate.slug);
  }

  const summary: AutoUpdateSummary = {
    totalFetched: input.candidates.length,
    candidateCount: decisions.length,
    duplicateCount: decisions.filter((item) =>
      item.reasons.some((reason) => /duplicate|similar name/i.test(reason)),
    ).length,
    createCount: decisions.filter((item) => item.status === "create").length,
    draftCount: decisions.filter((item) => item.status === "draft").length,
    updateEmptyCount: decisions.filter((item) => item.status === "update-empty").length,
    skipCount: decisions.filter((item) => item.status === "skip").length,
    publishedCount: decisions.filter((item) => item.publish).length,
    lowConfidenceCount: decisions.filter((item) =>
      item.reasons.includes("below minimum confidence threshold"),
    ).length,
    warningCount: decisions.reduce((sum, item) => sum + item.candidate.warnings.length, 0),
  };

  return { decisions, summary };
}

export function mapDecisionStatusToToolStatus(decision: CandidateDecision): ToolStatus {
  if (decision.publish) return ToolStatus.PUBLISHED;
  return ToolStatus.DRAFT;
}
