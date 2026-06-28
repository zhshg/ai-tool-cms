import { describe, expect, it, vi } from "vitest";
import { AiRouter } from "./AiRouter";
import { AiProviderRegistry } from "./AiProvider";
import { MockAiProvider } from "./providers/mock.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { AiRouterExhaustedError } from "./errors";
import { applySafetyFilters } from "./safety";
import { buildTokenUsage, estimateTokenCostUsd } from "./token-usage";

describe("MockAiProvider", () => {
  it("returns deterministic content", async () => {
    const provider = new MockAiProvider({ fixedContent: "Hello AI" });
    const result = await provider.complete({
      messages: [{ role: "user", content: "Write a summary" }],
    });

    expect(result.content).toBe("Hello AI");
    expect(result.provider).toBe("mock");
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });
});

describe("OpenAiProvider", () => {
  it("parses chat completion response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        model: "gpt-4o-mini",
        choices: [{ message: { content: "Generated text" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    });

    const provider = new OpenAiProvider({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.complete({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.content).toBe("Generated text");
    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.completionTokens).toBe(20);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("is unavailable without API key", () => {
    const provider = new OpenAiProvider();
    expect(provider.isAvailable()).toBe(false);
  });
});

describe("AiRouter", () => {
  it("uses default provider when available", async () => {
    const registry = new AiProviderRegistry();
    registry.register(new MockAiProvider({ fixedContent: "from mock" }));

    const router = new AiRouter(registry, {
      defaultProvider: "mock",
      fallbackProviders: [],
    });

    const result = await router.generate({
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.content).toBe("from mock");
  });

  it("falls back when primary fails", async () => {
    const registry = new AiProviderRegistry();
    registry.register(
      new OpenAiProvider({
        apiKey: "key",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: async () => ({}),
        }) as unknown as typeof fetch,
      }),
    );
    registry.register(new MockAiProvider({ fixedContent: "fallback ok" }));

    const router = new AiRouter(registry, {
      defaultProvider: "openai",
      fallbackProviders: ["mock"],
    });

    const result = await router.generate({
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.content).toBe("fallback ok");
    expect(result.provider).toBe("mock");
  });

  it("throws when all providers exhausted", async () => {
    const registry = new AiProviderRegistry();
    registry.register(new MockAiProvider({ shouldFail: true }));

    const router = new AiRouter(registry, {
      defaultProvider: "mock",
      disabledProviders: [],
    });

    await expect(
      router.generate({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toBeInstanceOf(AiRouterExhaustedError);
  });

  it("skips disabled providers", () => {
    const registry = new AiProviderRegistry();
    registry.register(new MockAiProvider());
    const router = new AiRouter(registry, {
      defaultProvider: "mock",
      disabledProviders: ["mock"],
    });

    expect(router.resolveProviderOrder()).toEqual([]);
  });
});

describe("safety", () => {
  it("scrubs email and enforces max length", () => {
    const input = "Contact admin@test.com for help. " + "x".repeat(100);
    const output = applySafetyFilters(input, { maxOutputChars: 40, scrubPii: true });
    expect(output).toContain("[email redacted]");
    expect(output.length).toBeLessThanOrEqual(41);
  });
});

describe("token-usage", () => {
  it("estimates cost for known models", () => {
    const usage = buildTokenUsage("gpt-4o-mini", 1000, 500);
    expect(usage.totalTokens).toBe(1500);
    expect(estimateTokenCostUsd("gpt-4o-mini", usage)).toBeGreaterThan(0);
  });
});
