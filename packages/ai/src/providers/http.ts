import {
  AiContentPolicyError,
  AiProviderHttpError,
  AiProviderUnavailableError,
  AiRateLimitError,
} from "../errors";
import { buildTokenUsage } from "../token-usage";
import type { ChatRequest, ChatResponse, ProviderHttpConfig } from "../types";

export type OpenAiCompatChatBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
};

export type OpenAiCompatChatResponse = {
  model?: string;
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
};

export type OpenAiCompatEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

export type OpenAiCompatModerationResponse = {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
  }>;
  error?: { message?: string };
};

export type OpenAiCompatImageResponse = {
  data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
  error?: { message?: string };
};

export async function postProviderJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<{ response: Response; data: T }> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { response, data };
}

export function assertProviderAvailable(
  providerId: string,
  apiKey: string | undefined,
  envName: string,
): void {
  if (!apiKey?.trim()) {
    throw new AiProviderUnavailableError(providerId, `${envName} not configured`);
  }
}

export function mapHttpError(providerId: string, response: Response, message: string): never {
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after")) * 1000;
    throw new AiRateLimitError(providerId, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  if (response.status === 400 && /content policy|safety/i.test(message)) {
    throw new AiContentPolicyError(providerId, message);
  }
  throw new AiProviderHttpError(providerId, response.status, message);
}

export async function openAiCompatChat(
  providerId: string,
  config: ProviderHttpConfig,
  baseUrl: string,
  request: ChatRequest,
  defaultModel: string,
): Promise<ChatResponse> {
  assertProviderAvailable(providerId, config.apiKey, "API key");
  const started = Date.now();
  const model = request.model ?? config.defaultChatModel ?? defaultModel;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const { response, data } = await postProviderJson<OpenAiCompatChatResponse>(
    config.fetchImpl ?? fetch,
    url,
    { authorization: `Bearer ${config.apiKey}` },
    {
      model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.7,
    } satisfies OpenAiCompatChatBody,
  );

  if (!response.ok) {
    mapHttpError(providerId, response, data.error?.message ?? `HTTP ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const resolvedModel = data.model ?? model;

  return {
    content,
    model: resolvedModel,
    usage: buildTokenUsage(
      resolvedModel,
      data.usage?.prompt_tokens ?? 0,
      data.usage?.completion_tokens ?? 0,
    ),
    latencyMs: Date.now() - started,
    finishReason: data.choices?.[0]?.finish_reason,
    raw: data,
  };
}

export async function openAiCompatEmbedding(
  providerId: string,
  config: ProviderHttpConfig,
  baseUrl: string,
  input: string,
  defaultModel: string,
): Promise<number[]> {
  assertProviderAvailable(providerId, config.apiKey, "API key");
  const model = defaultModel;
  const url = `${baseUrl.replace(/\/$/, "")}/embeddings`;

  const { response, data } = await postProviderJson<OpenAiCompatEmbeddingResponse>(
    config.fetchImpl ?? fetch,
    url,
    { authorization: `Bearer ${config.apiKey}` },
    { model, input },
  );

  if (!response.ok) {
    mapHttpError(providerId, response, data.error?.message ?? `HTTP ${response.status}`);
  }

  const vector = data.data?.[0]?.embedding;
  if (!vector?.length) {
    throw new AiProviderHttpError(providerId, response.status, "Empty embedding response");
  }
  return vector;
}

export async function openAiCompatModeration(
  providerId: string,
  config: ProviderHttpConfig,
  baseUrl: string,
  input: string,
  model = "text-moderation-latest",
) {
  assertProviderAvailable(providerId, config.apiKey, "API key");
  const started = Date.now();
  const url = `${baseUrl.replace(/\/$/, "")}/moderations`;

  const { response, data } = await postProviderJson<OpenAiCompatModerationResponse>(
    config.fetchImpl ?? fetch,
    url,
    { authorization: `Bearer ${config.apiKey}` },
    { model, input },
  );

  if (!response.ok) {
    mapHttpError(providerId, response, data.error?.message ?? `HTTP ${response.status}`);
  }

  const result = data.results?.[0];
  return {
    flagged: result?.flagged ?? false,
    categories: result?.categories ?? {},
    latencyMs: Date.now() - started,
  };
}

export async function openAiCompatImage(
  providerId: string,
  config: ProviderHttpConfig,
  baseUrl: string,
  prompt: string,
  model = "dall-e-3",
  size = "1024x1024",
) {
  assertProviderAvailable(providerId, config.apiKey, "API key");
  const started = Date.now();
  const url = `${baseUrl.replace(/\/$/, "")}/images/generations`;

  const { response, data } = await postProviderJson<OpenAiCompatImageResponse>(
    config.fetchImpl ?? fetch,
    url,
    { authorization: `Bearer ${config.apiKey}` },
    { model, prompt, size, n: 1 },
  );

  if (!response.ok) {
    mapHttpError(providerId, response, data.error?.message ?? `HTTP ${response.status}`);
  }

  const image = data.data?.[0];
  return {
    url: image?.url,
    b64Json: image?.b64_json,
    model,
    latencyMs: Date.now() - started,
    revisedPrompt: image?.revised_prompt,
  };
}
