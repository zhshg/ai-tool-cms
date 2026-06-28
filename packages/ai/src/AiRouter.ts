import type { Logger } from "@ai-tool-cms/logger";
import { createLogger } from "@ai-tool-cms/logger";
import type { AiProviderRegistry } from "./AiProvider";
import { AiRouterExhaustedError, AiContentPolicyError, isRetryableAiError } from "./errors";
import { applySafetyFilters, enforceMaxTokens } from "./safety";
import type { AiGenerateInput, AiCompletionResult, AiProviderId, AiRouterConfig } from "./types";
import { DEFAULT_AI_ROUTER_CONFIG } from "./types";

/**
 * Routes generation requests across providers with failover (RFC-0003).
 */
export class AiRouter {
  private readonly config: AiRouterConfig;

  constructor(
    private readonly registry: AiProviderRegistry,
    config: Partial<AiRouterConfig> = {},
    private readonly logger: Logger = createLogger({ service: "ai-router" }),
  ) {
    this.config = { ...DEFAULT_AI_ROUTER_CONFIG, ...config };
  }

  resolveProviderOrder(): AiProviderId[] {
    const disabled = new Set(this.config.disabledProviders ?? []);
    const candidates: AiProviderId[] = [
      this.config.defaultProvider,
      ...(this.config.fallbackProviders ?? []),
    ];

    const seen = new Set<AiProviderId>();
    const order: AiProviderId[] = [];

    for (const id of candidates) {
      if (disabled.has(id) || seen.has(id)) continue;
      seen.add(id);
      order.push(id);
    }

    return order;
  }

  async generate(input: AiGenerateInput): Promise<AiCompletionResult> {
    const order = this.resolveProviderOrder();
    const errors: unknown[] = [];
    const maxTokens = enforceMaxTokens(input.options?.maxTokens, this.config.maxTokensPerJob);

    for (const providerId of order) {
      const provider = this.registry.get(providerId);
      if (!provider) {
        this.logger.warn("Provider not registered", { providerId });
        continue;
      }
      if (!provider.isAvailable()) {
        this.logger.debug("Provider unavailable, skipping", { providerId });
        continue;
      }

      try {
        const result = await provider.complete({
          messages: input.messages,
          model: input.options?.model ?? this.config.defaultModel,
          maxTokens,
          temperature: input.options?.temperature,
          metadata: input.options?.metadata,
        });

        const applySafety = input.options?.applySafety ?? true;
        if (applySafety) {
          result.content = applySafetyFilters(result.content, {
            maxOutputChars: input.options?.maxOutputChars,
            scrubPii: true,
          });
        }

        this.logger.info("AI generation succeeded", {
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          estimatedCostUsd: result.usage.estimatedCostUsd,
        });

        return result;
      } catch (error) {
        errors.push(error);

        if (error instanceof AiContentPolicyError) {
          throw error;
        }

        this.logger.warn("AI provider attempt failed", {
          providerId,
          retryable: isRetryableAiError(error),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const message =
      errors.length > 0
        ? `All providers failed: ${errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ")}`
        : "No AI providers available";

    throw new AiRouterExhaustedError(message);
  }
}
