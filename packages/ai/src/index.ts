import { AIProviderRegistry, globalAIProviderRegistry } from "./AIProvider";
import { AIFactory } from "./AIFactory";

export type {
  ChatMessage,
  ChatMessageRole,
  ChatRequest,
  ChatResponse,
  ImageRequest,
  ImageResponse,
  ModerationRequest,
  ModerationResponse,
  ProviderId,
  ProviderHttpConfig,
  AiCompletionRequest,
  AiCompletionResult,
  AiGenerateInput,
  AiGenerateOptions,
  AiGenerationJobType,
  AiMessage,
  AiMessageRole,
  AiProviderId,
  AiRouterConfig,
  AiSafetyOptions,
  TokenUsage,
} from "./types";
export { DEFAULT_AI_ROUTER_CONFIG, DEFAULT_MODELS, MODEL_COST_PER_MILLION } from "./types";

export {
  AiError,
  AiContentPolicyError,
  AiProviderHttpError,
  AiProviderUnavailableError,
  AiRateLimitError,
  AiRouterExhaustedError,
  isRetryableAiError,
} from "./errors";
export { AiCapabilityUnsupportedError } from "./capability-errors";

export {
  AIProviderRegistry,
  globalAIProviderRegistry,
  type AIProvider,
  type AiProvider,
} from "./AIProvider";

export { AIFactory, type AIFactoryOptions } from "./AIFactory";
export { AiRouter, createAiRouterFromEnv, type CreateAiRouterOptions } from "./AiRouter";

export { applySafetyFilters, enforceMaxTokens } from "./safety";
export { buildTokenUsage, estimateTokenCostUsd, sumTokenUsage } from "./token-usage";

export { OpenAIProvider, type OpenAIProviderConfig } from "./providers/OpenAIProvider";
export { GeminiProvider, type GeminiProviderConfig } from "./providers/GeminiProvider";
export { ClaudeProvider, type ClaudeProviderConfig } from "./providers/ClaudeProvider";
export { DeepSeekProvider, type DeepSeekProviderConfig } from "./providers/DeepSeekProvider";
export { MockProvider, type MockProviderOptions } from "./providers/MockProvider";

/** @deprecated Use globalAIProviderRegistry */
export const globalAiProviderRegistry = globalAIProviderRegistry;
/** @deprecated Use AIProviderRegistry */
export { AIProviderRegistry as AiProviderRegistry };

/** @deprecated Use AIFactory.registerAll */
export function registerDefaultProviders(
  registry: AIProviderRegistry = globalAIProviderRegistry,
): AIProviderRegistry {
  AIFactory.registerAll(registry);
  return registry;
}

/** @deprecated Use AIFactory.create */
export function createProvidersFromEnv() {
  const ids = ["openai", "gemini", "claude", "deepseek", "mock"] as const;
  return ids.map((id) => AIFactory.create(id));
}

/** @deprecated Use OpenAIProvider */
export { OpenAIProvider as OpenAiProvider } from "./providers/OpenAIProvider";
/** @deprecated Use MockProvider */
export { MockProvider as MockAiProvider } from "./providers/MockProvider";

export {
  PromptEngine,
  defaultPromptEngine,
  PromptRegistry,
  pickWeightedVariant,
  resolvePromptsRoot,
  type PromptCatalogConfig,
  type PromptResolveOptions,
  type PromptTemplateId,
  type PromptVariables,
  type ResolvedPrompt,
  type ToolPromptContext,
} from "./prompt-engine/PromptEngine";

export {
  generateSummary,
  extractFeatures,
  generateProsCons,
  generateFaq,
  generateSeo,
  generateGeo,
  scoreQuality,
  QUALITY_THRESHOLD,
  type SummaryOutput,
  type FeatureExtractionOutput,
  type ProsConsOutput,
  type FaqItem,
  type SeoOutput,
  type GeoOutput,
  type QualityScoreOutput,
  type GeneratorOptions,
} from "./generators";

export {
  AI_PIPELINE_STAGES,
  AI_QUEUE_NAMES,
  nextStage,
  queueForStage,
  type AiPipelineJobPayload,
  type AiPipelineStageId,
  type AiQueueName,
  type AiQueuePayloadMap,
} from "./pipeline/types";

export {
  createPipelineRunId,
  enqueueNextStage,
  fullPipelineOrder,
  startAiPipeline,
  type EnqueueFn,
} from "./pipeline/orchestrator";

export {
  applyPipelineArtifacts,
  applyStagePayload,
  type PipelineArtifacts,
} from "./pipeline/apply-payload";

export { parseJsonFromLlm, clampScore } from "./utils/json";
