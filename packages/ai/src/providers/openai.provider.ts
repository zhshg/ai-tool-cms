import { BaseAiProvider } from "../AiProvider";
import type { AiCompletionRequest, AiCompletionResult } from "../types";
import {
  AiContentPolicyError,
  AiProviderHttpError,
  AiProviderUnavailableError,
  AiRateLimitError,
} from "../errors";
import { buildTokenUsage } from "../token-usage";

export type OpenAiProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
};

type OpenAiChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string; type?: string };
};

/**
 * OpenAI-compatible chat completions provider (Commit 031).
 */
export class OpenAiProvider extends BaseAiProvider {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";
  readonly capabilities = { supportsChat: true, supportsJsonMode: true };

  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenAiProviderConfig = {}) {
    super();
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  isAvailable(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.isAvailable()) {
      throw new AiProviderUnavailableError(this.id, "OPENAI_API_KEY not configured");
    }

    const started = Date.now();
    const model = request.model ?? this.config.defaultModel ?? "gpt-4o-mini";
    const baseUrl = (this.config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");

    const response = await this.fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0.7,
      }),
    });

    const latencyMs = Date.now() - started;
    const body = (await response.json()) as OpenAiChatResponse;

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) * 1000;
      throw new AiRateLimitError(this.id, Number.isFinite(retryAfter) ? retryAfter : undefined);
    }

    if (!response.ok) {
      const message = body.error?.message ?? `OpenAI HTTP ${response.status}`;
      if (response.status === 400 && /content policy|safety/i.test(message)) {
        throw new AiContentPolicyError(this.id, message);
      }
      throw new AiProviderHttpError(this.id, response.status, message);
    }

    const content = body.choices?.[0]?.message?.content ?? "";
    const finishReason = body.choices?.[0]?.finish_reason;
    const resolvedModel = body.model ?? model;
    const usage = buildTokenUsage(
      resolvedModel,
      body.usage?.prompt_tokens ?? 0,
      body.usage?.completion_tokens ?? 0,
    );

    return {
      content,
      provider: this.id,
      model: resolvedModel,
      usage,
      latencyMs,
      finishReason,
      raw: body,
    };
  }
}
