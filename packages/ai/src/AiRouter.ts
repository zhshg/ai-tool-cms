import type { Logger } from "@ai-tool-cms/logger";
import { createLogger } from "@ai-tool-cms/logger";
import { getEnv } from "@ai-tool-cms/config";
import type { AIProviderRegistry } from "./AIProvider";
import { globalAIProviderRegistry } from "./AIProvider";
import { AIFactory } from "./AIFactory";
import { AiRouterExhaustedError, AiContentPolicyError, isRetryableAiError } from "./errors";
import { applySafetyFilters, enforceMaxTokens } from "./safety";
import type { AiGenerateInput, AiCompletionResult, ProviderId, AiRouterConfig } from "./types";
import { DEFAULT_AI_ROUTER_CONFIG } from "./types";

/**
 * Routes chat requests across providers with failover (RFC-0003).
 * Business code should depend on AiRouter / AIFactory, never vendor APIs.
 */
export class AiRouter {
  private readonly config: AiRouterConfig;

  constructor(
    private readonly registry: AIProviderRegistry,
    config: Partial<AiRouterConfig> = {},
    private readonly logger: Logger = createLogger({ service: "ai-router" }),
  ) {
    this.config = { ...DEFAULT_AI_ROUTER_CONFIG, ...config };
  }

  resolveProviderOrder(): ProviderId[] {
    const disabled = new Set(this.config.disabledProviders ?? []);
    const candidates: ProviderId[] = [
      this.config.defaultProvider,
      ...(this.config.fallbackProviders ?? []),
    ];

    const seen = new Set<ProviderId>();
    const order: ProviderId[] = [];

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
        const chat = await provider.chat({
          messages: input.messages,
          model: input.options?.model ?? this.config.defaultModel,
          maxTokens,
          temperature: input.options?.temperature,
          metadata: input.options?.metadata,
        });

        const applySafety = input.options?.applySafety ?? true;
        const content = applySafety
          ? applySafetyFilters(chat.content, {
              maxOutputChars: input.options?.maxOutputChars,
              scrubPii: true,
            })
          : chat.content;

        const result: AiCompletionResult = {
          ...chat,
          content,
          provider: providerId,
        };

        this.logger.info("AI generation succeeded", {
          provider: providerId,
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

export type CreateAiRouterOptions = {
  registry?: AIProviderRegistry;
  routerConfig?: Partial<AiRouterConfig>;
};

export function createAiRouterFromEnv(options: CreateAiRouterOptions = {}): AiRouter {
  const env = getEnv();
  const registry = options.registry ?? globalAIProviderRegistry;

  if (registry.list().length === 0) {
    AIFactory.registerAll(registry, { env });
  }

  const defaultProvider: ProviderId = env.OPENAI_API_KEY
    ? "openai"
    : env.GEMINI_API_KEY
      ? "gemini"
      : env.ANTHROPIC_API_KEY
        ? "claude"
        : env.DEEPSEEK_API_KEY
          ? "deepseek"
          : "mock";

  return new AiRouter(
    registry,
    {
      defaultProvider,
      fallbackProviders: ["mock"],
      defaultModel: env.AI_DEFAULT_MODEL,
      ...options.routerConfig,
    },
    createLogger({ service: "ai-router" }),
  );
}
