import type {
  AutoUpdateOptions,
  CandidateDecision,
  SourceRunResult,
  AutoUpdateSummary,
} from "./types";

export function renderReport(input: {
  options: AutoUpdateOptions;
  summary: AutoUpdateSummary;
  sources: SourceRunResult[];
  decisions: CandidateDecision[];
  errors: string[];
  warnings: string[];
  snapshotPath: string;
  logPath: string;
}): string {
  const lines: string[] = [];
  lines.push(`# Auto Update Report - ${input.options.date}`);
  lines.push("");
  lines.push("## Run Summary");
  lines.push("");
  lines.push(`- mode: \`${input.options.mode}\``);
  lines.push(`- dry-run: \`${String(input.options.dryRun)}\``);
  lines.push(`- apply requested: \`${String(input.options.apply)}\``);
  lines.push(`- source filters: ${input.options.sourceIds.map((item) => `\`${item}\``).join(", ")}`);
  lines.push(`- fetched: \`${input.summary.totalFetched}\``);
  lines.push(`- candidates: \`${input.summary.candidateCount}\``);
  lines.push(`- duplicates: \`${input.summary.duplicateCount}\``);
  lines.push(`- create: \`${input.summary.createCount}\``);
  lines.push(`- draft: \`${input.summary.draftCount}\``);
  lines.push(`- update-empty: \`${input.summary.updateEmptyCount}\``);
  lines.push(`- skip: \`${input.summary.skipCount}\``);
  lines.push(`- published: \`${input.summary.publishedCount}\``);
  lines.push(`- low-confidence: \`${input.summary.lowConfidenceCount}\``);
  lines.push(`- warnings: \`${input.summary.warningCount + input.warnings.length}\``);
  lines.push(`- candidate snapshot: \`${input.snapshotPath}\``);
  lines.push(`- log file: \`${input.logPath}\``);
  lines.push("");
  lines.push("## Sources");
  lines.push("");
  for (const source of input.sources) {
    lines.push(
      `- ${source.sourceName} (\`${source.sourceId}\`): fetched=${source.fetchedCount}, requestedLimit=${source.requestedLimit}, errors=${source.errors.length}`,
    );
  }
  lines.push("");
  lines.push("## Tool Decisions");
  lines.push("");
  input.decisions.forEach((decision, index) => {
    lines.push(`### ${index + 1}. ${decision.candidate.name}`);
    lines.push("");
    lines.push(`- result: \`${decision.status}${decision.publish ? " + published" : ""}\``);
    lines.push(`- source: \`${decision.candidate.sourceName}\``);
    lines.push(`- sourceUrl: ${decision.candidate.sourceUrl}`);
    lines.push(`- websiteUrl: ${decision.candidate.websiteUrl ?? "null"}`);
    lines.push(`- logoUrl: ${decision.candidate.logoUrl ?? "null"}`);
    lines.push(`- category: ${decision.candidate.category ?? "null"}`);
    lines.push(`- confidenceScore: \`${decision.candidate.confidenceScore}\``);
    lines.push(`- slug: \`${decision.candidate.slug}\``);
    lines.push(`- pricingType: \`${decision.candidate.pricingType}\``);
    lines.push(`- reasons: ${decision.reasons.length ? decision.reasons.join("; ") : "none"}`);
    lines.push(
      `- updateFields: ${decision.updateFields.length ? decision.updateFields.join(", ") : "none"}`,
    );
    lines.push(`- shortDescription: ${decision.candidate.shortDescription ?? "null"}`);
    lines.push("");
  });
  lines.push("## Errors");
  lines.push("");
  if (!input.errors.length) {
    lines.push("- None");
  } else {
    input.errors.forEach((error) => lines.push(`- ${error}`));
  }
  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  if (!input.warnings.length) {
    lines.push("- None");
  } else {
    input.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  lines.push("- Review `skip` and `draft` items before enabling any broader auto-apply behavior.");
  lines.push("- Confirm weak website extraction sources, especially Product Hunt and community-link sources.");
  lines.push("- Keep `TOOLS_AUTO_APPLY=false` in production until reports stay stable for several days.");
  lines.push("");
  return lines.join("\n");
}
