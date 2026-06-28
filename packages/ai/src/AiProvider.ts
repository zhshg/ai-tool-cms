import type { AiCompletionRequest, AiCompletionResult, AiProviderId } from "./types";

export type AiProviderCapabilities = {
  supportsChat: boolean;
  supportsJsonMode?: boolean;
};

/**
 * Provider adapter contract — one implementation per LLM vendor (RFC-0003).
 */
export type AiProvider = {
  readonly id: AiProviderId;
  readonly displayName: string;
  readonly capabilities: AiProviderCapabilities;

  /** Whether this provider can accept requests (e.g. API key configured). */
  isAvailable(): boolean;

  /** Execute a chat completion. */
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
};

export abstract class BaseAiProvider implements AiProvider {
  abstract readonly id: AiProviderId;
  abstract readonly displayName: string;
  abstract readonly capabilities: AiProviderCapabilities;

  abstract isAvailable(): boolean;
  abstract complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

export class AiProviderRegistry {
  private readonly providers = new Map<AiProviderId, AiProvider>();

  register(provider: AiProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: AiProviderId): AiProvider | undefined {
    return this.providers.get(id);
  }

  list(): AiProvider[] {
    return [...this.providers.values()];
  }

  listAvailable(): AiProvider[] {
    return this.list().filter((provider) => provider.isAvailable());
  }
}

export const globalAiProviderRegistry = new AiProviderRegistry();
