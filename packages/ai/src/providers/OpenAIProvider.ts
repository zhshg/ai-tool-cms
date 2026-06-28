import type { AIProvider } from "../AIProvider";
import type {
  ChatRequest,
  ChatResponse,
  ImageRequest,
  ImageResponse,
  ModerationRequest,
  ModerationResponse,
  ProviderHttpConfig,
} from "../types";
import {
  openAiCompatChat,
  openAiCompatEmbedding,
  openAiCompatImage,
  openAiCompatModeration,
} from "./http";

export type OpenAIProviderConfig = ProviderHttpConfig & {
  defaultImageModel?: string;
  defaultEmbeddingModel?: string;
};

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly displayName = "OpenAI";

  constructor(private readonly config: OpenAIProviderConfig = {}) {}

  isAvailable(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    return openAiCompatChat(
      this.id,
      this.config,
      this.config.baseUrl ?? "https://api.openai.com/v1",
      input,
      "gpt-4o-mini",
    );
  }

  async embedding(input: string, model?: string): Promise<number[]> {
    return openAiCompatEmbedding(
      this.id,
      this.config,
      this.config.baseUrl ?? "https://api.openai.com/v1",
      input,
      model ?? this.config.defaultEmbeddingModel ?? "text-embedding-3-small",
    );
  }

  async image(input: ImageRequest): Promise<ImageResponse> {
    return openAiCompatImage(
      this.id,
      this.config,
      this.config.baseUrl ?? "https://api.openai.com/v1",
      input.prompt,
      input.model ?? this.config.defaultImageModel ?? "dall-e-3",
      input.size ?? "1024x1024",
    );
  }

  async moderation(input: ModerationRequest): Promise<ModerationResponse> {
    return openAiCompatModeration(
      this.id,
      this.config,
      this.config.baseUrl ?? "https://api.openai.com/v1",
      input.input,
      input.model,
    );
  }
}
