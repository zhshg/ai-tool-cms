/** Canonical provider slugs (NamingConvention §14). */
export type AiProviderId = "openai" | "anthropic" | "gemini" | "mock";

/** AI generation job types (RFC-0003). */
export type AiGenerationJobType =
  | "GENERATE_DESCRIPTION"
  | "GENERATE_SUMMARY"
  | "GENERATE_FAQ"
  | "GENERATE_COMPARE"
  | "GENERATE_ALTERNATIVES";

export type AiMessageRole = "system" | "user" | "assistant";

export type AiMessage = {
  role: AiMessageRole;
  content: string;
};

export type AiCompletionRequest = {
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
};

export type AiCompletionResult = {
  content: string;
  provider: AiProviderId;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  finishReason?: string;
  raw?: unknown;
};

export type AiRouterConfig = {
  defaultProvider: AiProviderId;
  fallbackProviders?: AiProviderId[];
  disabledProviders?: AiProviderId[];
  maxTokensPerJob?: number;
  defaultModel?: string;
};

export type AiGenerateOptions = {
  /** Override router default model for this call. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Apply safety filters (PII scrub, max length). Default true. */
  applySafety?: boolean;
  /** Max output characters after generation. */
  maxOutputChars?: number;
  metadata?: Record<string, unknown>;
};

export type AiGenerateInput = {
  messages: AiMessage[];
  options?: AiGenerateOptions;
};

export type AiSafetyOptions = {
  maxOutputChars?: number;
  scrubPii?: boolean;
};

export const DEFAULT_AI_ROUTER_CONFIG: AiRouterConfig = {
  defaultProvider: "openai",
  fallbackProviders: [],
  disabledProviders: [],
  maxTokensPerJob: 4096,
  defaultModel: "gpt-4o-mini",
};

/** Rough USD per 1M tokens for cost estimation (OpenAI gpt-4o-mini baseline). */
export const MODEL_COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};
