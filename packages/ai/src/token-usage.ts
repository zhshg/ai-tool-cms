import type { TokenUsage } from "./types";
import { MODEL_COST_PER_MILLION } from "./types";

export function estimateTokenCostUsd(
  model: string,
  usage: Pick<TokenUsage, "promptTokens" | "completionTokens">,
): number | undefined {
  const rates = MODEL_COST_PER_MILLION[model];
  if (!rates) return undefined;

  const inputCost = (usage.promptTokens / 1_000_000) * rates.input;
  const outputCost = (usage.completionTokens / 1_000_000) * rates.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export function buildTokenUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
): TokenUsage {
  const totalTokens = promptTokens + completionTokens;
  const usage: TokenUsage = { promptTokens, completionTokens, totalTokens };
  const estimated = estimateTokenCostUsd(model, usage);
  if (estimated !== undefined) {
    usage.estimatedCostUsd = estimated;
  }
  return usage;
}

export function sumTokenUsage(usages: TokenUsage[]): TokenUsage {
  const promptTokens = usages.reduce((sum, u) => sum + u.promptTokens, 0);
  const completionTokens = usages.reduce((sum, u) => sum + u.completionTokens, 0);
  const totalTokens = promptTokens + completionTokens;
  const estimatedCostUsd = usages.reduce((sum, u) => sum + (u.estimatedCostUsd ?? 0), 0);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimatedCostUsd > 0 ? estimatedCostUsd : undefined,
  };
}
