import type { Env } from "@ai-tool-cms/config";
import { getEnv } from "@ai-tool-cms/config";
import type { AIProvider } from "./AIProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { DeepSeekProvider } from "./providers/DeepSeekProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { MockProvider, type MockProviderOptions } from "./providers/MockProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import type { ProviderId } from "./types";
import { DEFAULT_MODELS } from "./types";

export type AIFactoryOptions = {
  env?: Env;
  mock?: MockProviderOptions;
};

/**
 * Create AI providers by id — switch vendors without changing business code.
 *
 * @example
 * const openai = AIFactory.create("openai");
 * const gemini = AIFactory.create("gemini");
 */
export class AIFactory {
  static create(id: ProviderId, options: AIFactoryOptions = {}): AIProvider {
    const env = options.env ?? getEnv();

    switch (id) {
      case "openai":
        return new OpenAIProvider({
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL,
          defaultChatModel: env.AI_DEFAULT_MODEL ?? DEFAULT_MODELS.openai,
        });
      case "gemini":
        return new GeminiProvider({
          apiKey: env.GEMINI_API_KEY,
          defaultChatModel: DEFAULT_MODELS.gemini,
        });
      case "claude":
        return new ClaudeProvider({
          apiKey: env.ANTHROPIC_API_KEY,
          defaultChatModel: DEFAULT_MODELS.claude,
        });
      case "deepseek":
        return new DeepSeekProvider({
          apiKey: env.DEEPSEEK_API_KEY,
          baseUrl: env.DEEPSEEK_BASE_URL,
          defaultChatModel: DEFAULT_MODELS.deepseek,
        });
      case "mock":
        return new MockProvider(options.mock);
      default: {
        const exhaustive: never = id;
        throw new Error(`Unknown provider: ${exhaustive}`);
      }
    }
  }

  /** First configured cloud provider, otherwise mock. */
  static createDefault(options: AIFactoryOptions = {}): AIProvider {
    const env = options.env ?? getEnv();
    if (env.OPENAI_API_KEY) return AIFactory.create("openai", { env, ...options });
    if (env.GEMINI_API_KEY) return AIFactory.create("gemini", { env, ...options });
    if (env.ANTHROPIC_API_KEY) return AIFactory.create("claude", { env, ...options });
    if (env.DEEPSEEK_API_KEY) return AIFactory.create("deepseek", { env, ...options });
    return AIFactory.create("mock", { env, ...options });
  }

  static registerAll(
    registry: { register(provider: AIProvider): unknown },
    options: AIFactoryOptions = {},
  ): void {
    const ids: ProviderId[] = ["openai", "gemini", "claude", "deepseek", "mock"];
    for (const id of ids) {
      registry.register(AIFactory.create(id, options));
    }
  }
}
