import type { AIProvider } from "../AIProvider";
import { AiCapabilityUnsupportedError } from "../capability-errors";
import { buildTokenUsage } from "../token-usage";
import type { ChatRequest, ChatResponse, ProviderHttpConfig } from "../types";
import { assertProviderAvailable, mapHttpError, postProviderJson } from "./http";

export type ClaudeProviderConfig = ProviderHttpConfig & {
  apiVersion?: string;
};

type ClaudeMessagesResponse = {
  model?: string;
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export class ClaudeProvider implements AIProvider {
  readonly id = "claude" as const;
  readonly displayName = "Anthropic Claude";

  constructor(private readonly config: ClaudeProviderConfig = {}) {}

  isAvailable(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  private baseUrl(): string {
    return this.config.baseUrl ?? "https://api.anthropic.com";
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    assertProviderAvailable(this.id, this.config.apiKey, "ANTHROPIC_API_KEY");
    const started = Date.now();
    const model = input.model ?? this.config.defaultChatModel ?? "claude-3-5-sonnet-20241022";
    const version = this.config.apiVersion ?? "2023-06-01";
    const url = `${this.baseUrl().replace(/\/$/, "")}/v1/messages`;

    const system = input.messages.find((m) => m.role === "system")?.content;
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const { response, data } = await postProviderJson<ClaudeMessagesResponse>(
      this.config.fetchImpl ?? fetch,
      url,
      {
        "x-api-key": this.config.apiKey!,
        "anthropic-version": version,
      },
      {
        model,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature ?? 0.7,
        system,
        messages,
      },
    );

    if (!response.ok) {
      mapHttpError(this.id, response, data.error?.message ?? `HTTP ${response.status}`);
    }

    const content = data.content?.find((part) => part.type === "text")?.text ?? "";
    const resolvedModel = data.model ?? model;

    return {
      content,
      model: resolvedModel,
      usage: buildTokenUsage(
        resolvedModel,
        data.usage?.input_tokens ?? 0,
        data.usage?.output_tokens ?? 0,
      ),
      latencyMs: Date.now() - started,
      finishReason: data.stop_reason,
      raw: data,
    };
  }

  async embedding(_input: string, _model?: string): Promise<number[]> {
    throw new AiCapabilityUnsupportedError(this.id, "embedding");
  }
}
