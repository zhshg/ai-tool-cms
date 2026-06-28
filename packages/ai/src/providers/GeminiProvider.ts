import type { AIProvider } from "../AIProvider";
import { AiCapabilityUnsupportedError } from "../capability-errors";
import { buildTokenUsage } from "../token-usage";
import type { ChatRequest, ChatResponse, ProviderHttpConfig } from "../types";
import { assertProviderAvailable, mapHttpError, postProviderJson } from "./http";

export type GeminiProviderConfig = ProviderHttpConfig & {
  apiVersion?: string;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string };
};

type GeminiEmbedResponse = {
  embedding?: { values?: number[] };
  error?: { message?: string };
};

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly displayName = "Google Gemini";

  constructor(private readonly config: GeminiProviderConfig = {}) {}

  isAvailable(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  private apiBase(): string {
    const version = this.config.apiVersion ?? "v1beta";
    return `https://generativelanguage.googleapis.com/${version}`;
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    assertProviderAvailable(this.id, this.config.apiKey, "GEMINI_API_KEY");
    const started = Date.now();
    const model = input.model ?? this.config.defaultChatModel ?? "gemini-1.5-flash";
    const url = `${this.apiBase()}/models/${model}:generateContent?key=${this.config.apiKey}`;

    const system = input.messages.find((m) => m.role === "system")?.content;
    const contents = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const { response, data } = await postProviderJson<GeminiGenerateResponse>(
      this.config.fetchImpl ?? fetch,
      url,
      {},
      {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: input.maxTokens,
          temperature: input.temperature ?? 0.7,
        },
      },
    );

    if (!response.ok) {
      mapHttpError(this.id, response, data.error?.message ?? `HTTP ${response.status}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return {
      content,
      model,
      usage: buildTokenUsage(
        model,
        data.usageMetadata?.promptTokenCount ?? 0,
        data.usageMetadata?.candidatesTokenCount ?? 0,
      ),
      latencyMs: Date.now() - started,
      finishReason: data.candidates?.[0]?.finishReason,
      raw: data,
    };
  }

  async embedding(input: string, model?: string): Promise<number[]> {
    assertProviderAvailable(this.id, this.config.apiKey, "GEMINI_API_KEY");
    const resolvedModel = model ?? this.config.defaultEmbeddingModel ?? "text-embedding-004";
    const url = `${this.apiBase()}/models/${resolvedModel}:embedContent?key=${this.config.apiKey}`;

    const { response, data } = await postProviderJson<GeminiEmbedResponse>(
      this.config.fetchImpl ?? fetch,
      url,
      {},
      {
        content: { parts: [{ text: input }] },
      },
    );

    if (!response.ok) {
      mapHttpError(this.id, response, data.error?.message ?? `HTTP ${response.status}`);
    }

    const vector = data.embedding?.values;
    if (!vector?.length) {
      throw new AiCapabilityUnsupportedError(this.id, "embedding");
    }
    return vector;
  }
}
