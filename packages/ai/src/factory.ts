import type { Env } from "@ai-tool-cms/config";
import { getEnv } from "@ai-tool-cms/config";
import { createLogger } from "@ai-tool-cms/logger";
import { AiProviderRegistry, globalAiProviderRegistry, type AiProvider } from "./AiProvider";
import { AiRouter } from "./AiRouter";
import { MockAiProvider } from "./providers/mock.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import type { AiRouterConfig } from "./types";
import { DEFAULT_AI_ROUTER_CONFIG } from "./types";

export type CreateAiStackOptions = {
  env?: Env;
  routerConfig?: Partial<AiRouterConfig>;
  registry?: AiProviderRegistry;
  includeMock?: boolean;
};

export function createProvidersFromEnv(env: Env = getEnv()): AiProvider[] {
  const providers: AiProvider[] = [];

  if (env.OPENAI_API_KEY) {
    providers.push(
      new OpenAiProvider({
        apiKey: env.OPENAI_API_KEY,
        baseUrl: env.OPENAI_BASE_URL,
        defaultModel: env.AI_DEFAULT_MODEL,
      }),
    );
  }

  providers.push(new MockAiProvider());

  return providers;
}

export function registerDefaultProviders(
  registry: AiProviderRegistry = globalAiProviderRegistry,
  env: Env = getEnv(),
): AiProviderRegistry {
  for (const provider of createProvidersFromEnv(env)) {
    registry.register(provider);
  }
  return registry;
}

export function createAiRouterFromEnv(options: CreateAiStackOptions = {}): AiRouter {
  const env = options.env ?? getEnv();
  const registry = options.registry ?? globalAiProviderRegistry;

  if (registry.list().length === 0) {
    registerDefaultProviders(registry, env);
  }

  const hasOpenAi = Boolean(env.OPENAI_API_KEY);
  const routerConfig: AiRouterConfig = {
    ...DEFAULT_AI_ROUTER_CONFIG,
    defaultProvider: hasOpenAi ? "openai" : "mock",
    fallbackProviders: hasOpenAi ? ["mock"] : [],
    defaultModel: env.AI_DEFAULT_MODEL,
    ...options.routerConfig,
  };

  return new AiRouter(registry, routerConfig, createLogger({ service: "ai-router" }));
}
