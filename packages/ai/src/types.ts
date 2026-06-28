/** Canonical provider slugs — use with `AIFactory.create(id)`. */
export type ProviderId = "openai" | "gemini" | "claude" | "deepseek" | "mock";

/** @deprecated Use ProviderId */
export type AiProviderId = ProviderId;

/** AI generation job types (RFC-0003). */
export type AiGenerationJobType =
  | "GENERATE_DESCRIPTION"
  | "GENERATE_SUMMARY"
  | "GENERATE_FAQ"
  | "GENERATE_COMPARE"
  | "GENERATE_ALTERNATIVES";

export type ChatMessageRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatMessageRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
};

/** @deprecated Use ChatRequest */
export type AiMessage = ChatMessage;
/** @deprecated Use ChatMessageRole */
export type AiMessageRole = ChatMessageRole;
/** @deprecated Use ChatRequest */
export type AiCompletionRequest = ChatRequest;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
};

export type ChatResponse = {
  content: string;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  finishReason?: string;
  raw?: unknown;
};

export type ImageRequest = {
  prompt: string;
  model?: string;
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
};

export type ImageResponse = {
  url?: string;
  b64Json?: string;
  model: string;
  latencyMs: number;
  revisedPrompt?: string;
};

export type ModerationRequest = {
  input: string;
  model?: string;
};

export type ModerationResponse = {
  flagged: boolean;
  categories: Record<string, boolean>;
  latencyMs: number;
};

export type AiCompletionResult = ChatResponse & {
  provider: ProviderId;
};

export type AiRouterConfig = {
  defaultProvider: ProviderId;
  fallbackProviders?: ProviderId[];
  disabledProviders?: ProviderId[];
  maxTokensPerJob?: number;
  defaultModel?: string;
};

export type AiGenerateOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  applySafety?: boolean;
  maxOutputChars?: number;
  metadata?: Record<string, unknown>;
};

export type AiGenerateInput = {
  messages: ChatMessage[];
  options?: AiGenerateOptions;
};

export type AiSafetyOptions = {
  maxOutputChars?: number;
  scrubPii?: boolean;
};

export const DEFAULT_AI_ROUTER_CONFIG: AiRouterConfig = {
  defaultProvider: "openai",
  fallbackProviders: ["mock"],
  disabledProviders: [],
  maxTokensPerJob: 4096,
  defaultModel: "gpt-4o-mini",
};

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  claude: "claude-3-5-sonnet-20241022",
  deepseek: "deepseek-chat",
  mock: "mock-model",
};

export const MODEL_COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "deepseek-chat": { input: 0.14, output: 0.28 },
};

export type ProviderHttpConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultChatModel?: string;
  defaultEmbeddingModel?: string;
  fetchImpl?: typeof fetch;
};
