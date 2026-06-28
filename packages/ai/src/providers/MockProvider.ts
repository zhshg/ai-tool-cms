import type { AIProvider } from "../AIProvider";
import { buildTokenUsage } from "../token-usage";
import type {
  ChatRequest,
  ChatResponse,
  ImageRequest,
  ImageResponse,
  ModerationRequest,
  ModerationResponse,
} from "../types";

export type MockProviderOptions = {
  fixedContent?: string;
  latencyMs?: number;
  shouldFail?: boolean;
  embeddingDimensions?: number;
};

export class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly displayName = "Mock AI";

  constructor(private readonly options: MockProviderOptions = {}) {}

  isAvailable(): boolean {
    return true;
  }

  async chat(input: ChatRequest): Promise<ChatResponse> {
    if (this.options.shouldFail) {
      throw new Error("Mock provider failure");
    }

    if (this.options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs));
    }

    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const content =
      this.options.fixedContent ?? `Mock response for: ${lastUser?.content ?? "(empty)"}`;
    const model = input.model ?? "mock-model";
    const promptTokens = input.messages.reduce((sum, m) => sum + m.content.length, 0);
    const completionTokens = content.length;

    return {
      content,
      model,
      usage: buildTokenUsage(model, promptTokens, completionTokens),
      latencyMs: this.options.latencyMs ?? 1,
      finishReason: "stop",
    };
  }

  async embedding(input: string): Promise<number[]> {
    const dims = this.options.embeddingDimensions ?? 8;
    const vector: number[] = [];
    for (let i = 0; i < dims; i += 1) {
      vector.push(((input.charCodeAt(i % input.length) || 0) % 100) / 100);
    }
    return vector;
  }

  async image(input: ImageRequest): Promise<ImageResponse> {
    return {
      url: `https://mock.ai-tool-cms.local/images/${encodeURIComponent(input.prompt.slice(0, 32))}.png`,
      model: input.model ?? "mock-image",
      latencyMs: 1,
    };
  }

  async moderation(input: ModerationRequest): Promise<ModerationResponse> {
    const flagged = /unsafe|violence/i.test(input.input);
    return {
      flagged,
      categories: { harassment: flagged },
      latencyMs: 1,
    };
  }
}
