import { BaseAiProvider } from "../AiProvider";
import type { AiCompletionRequest, AiCompletionResult } from "../types";
import { buildTokenUsage } from "../token-usage";

export type MockAiProviderOptions = {
  /** Fixed response text (default: echoes last user message). */
  fixedContent?: string;
  /** Simulated latency in ms. */
  latencyMs?: number;
  /** Throw on complete (for router failover tests). */
  shouldFail?: boolean;
};

/**
 * Deterministic provider for tests and local dev without API keys.
 */
export class MockAiProvider extends BaseAiProvider {
  readonly id = "mock" as const;
  readonly displayName = "Mock AI";
  readonly capabilities = { supportsChat: true };

  constructor(private readonly options: MockAiProviderOptions = {}) {
    super();
  }

  isAvailable(): boolean {
    return true;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    if (this.options.shouldFail) {
      throw new Error("Mock provider failure");
    }

    if (this.options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs));
    }

    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    const content =
      this.options.fixedContent ?? `Mock response for: ${lastUser?.content ?? "(empty)"}`;

    const model = request.model ?? "mock-model";
    const promptTokens = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    const completionTokens = content.length;

    return {
      content,
      provider: this.id,
      model,
      usage: buildTokenUsage(model, promptTokens, completionTokens),
      latencyMs: this.options.latencyMs ?? 1,
      finishReason: "stop",
    };
  }
}
