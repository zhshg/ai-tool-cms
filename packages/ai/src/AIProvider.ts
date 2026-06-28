import type {
  ChatRequest,
  ChatResponse,
  ImageRequest,
  ImageResponse,
  ModerationRequest,
  ModerationResponse,
  ProviderId,
} from "./types";

/**
 * Unified AI provider contract — business code must use this, never vendor SDKs directly.
 */
export interface AIProvider {
  readonly id: ProviderId;
  readonly displayName: string;

  isAvailable(): boolean;

  chat(input: ChatRequest): Promise<ChatResponse>;

  embedding(input: string, model?: string): Promise<number[]>;

  image?(input: ImageRequest): Promise<ImageResponse>;

  moderation?(input: ModerationRequest): Promise<ModerationResponse>;
}

export class AIProviderRegistry {
  private readonly providers = new Map<ProviderId, AIProvider>();

  register(provider: AIProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: ProviderId): AIProvider | undefined {
    return this.providers.get(id);
  }

  list(): AIProvider[] {
    return [...this.providers.values()];
  }

  listAvailable(): AIProvider[] {
    return this.list().filter((provider) => provider.isAvailable());
  }
}

export const globalAIProviderRegistry = new AIProviderRegistry();

/** @deprecated Use AIProvider */
export type AiProvider = AIProvider;
/** @deprecated Use AIProviderRegistry */
export const AiProviderRegistry = AIProviderRegistry;
/** @deprecated Use globalAIProviderRegistry */
export const globalAiProviderRegistry = globalAIProviderRegistry;
