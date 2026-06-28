import type { AIProvider } from "../AIProvider";
import type { ChatRequest, ChatResponse, ProviderHttpConfig } from "../types";
import { openAiCompatChat, openAiCompatEmbedding } from "./http";

export type DeepSeekProviderConfig = ProviderHttpConfig;

export class DeepSeekProvider implements AIProvider {
  readonly id = "deepseek" as const;
  readonly displayName = "DeepSeek";

  constructor(private readonly config: DeepSeekProviderConfig = {}) {}

  isAvailable(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  private baseUrl(): string {
    return this.config.baseUrl ?? "https://api.deepseek.com/v1";
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    return openAiCompatChat(this.id, this.config, this.baseUrl(), input, "deepseek-chat");
  }

  async embedding(input: string, model?: string): Promise<number[]> {
    return openAiCompatEmbedding(
      this.id,
      this.config,
      this.baseUrl(),
      input,
      model ?? this.config.defaultEmbeddingModel ?? "deepseek-embedding",
    );
  }
}
