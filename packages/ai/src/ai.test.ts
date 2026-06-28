import { describe, expect, it, vi } from "vitest";
import { AIFactory } from "./AIFactory";
import { AiRouter } from "./AiRouter";
import { AIProviderRegistry } from "./AIProvider";
import { MockProvider } from "./providers/MockProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { AiRouterExhaustedError } from "./errors";
import { AiCapabilityUnsupportedError } from "./capability-errors";
import { applySafetyFilters } from "./safety";
import { buildTokenUsage, estimateTokenCostUsd } from "./token-usage";

describe("AIFactory", () => {
  it("creates providers by id", () => {
    const mock = AIFactory.create("mock");
    const openai = AIFactory.create("openai", { env: { OPENAI_API_KEY: "sk-test" } as never });

    expect(mock.id).toBe("mock");
    expect(openai.id).toBe("openai");
    expect(mock.isAvailable()).toBe(true);
    expect(openai.isAvailable()).toBe(true);
  });

  it("switches provider without changing call site", async () => {
    const messages = [{ role: "user" as const, content: "hello" }];

    const openai = AIFactory.create("mock", { mock: { fixedContent: "from mock" } });
    const gemini = AIFactory.create("mock", { mock: { fixedContent: "from gemini-slot" } });

    const a = await openai.chat({ messages });
    const b = await gemini.chat({ messages });

    expect(a.content).toBe("from mock");
    expect(b.content).toBe("from gemini-slot");
  });
});

describe("MockProvider", () => {
  it("implements chat, embedding, image, moderation", async () => {
    const provider = new MockProvider({ fixedContent: "Hello AI" });

    const chat = await provider.chat({ messages: [{ role: "user", content: "Hi" }] });
    const vector = await provider.embedding("test");
    const image = await provider.image!({ prompt: "logo" });
    const mod = await provider.moderation!({ input: "safe text" });

    expect(chat.content).toBe("Hello AI");
    expect(vector.length).toBeGreaterThan(0);
    expect(image.url).toContain("mock.ai-tool-cms.local");
    expect(mod.flagged).toBe(false);
  });
});

describe("OpenAIProvider", () => {
  it("uses chat() without direct business OpenAI calls", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        model: "gpt-4o-mini",
        choices: [{ message: { content: "Generated text" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    });

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await provider.chat({ messages: [{ role: "user", content: "Hi" }] });

    expect(result.content).toBe("Generated text");
    expect(result.usage.promptTokens).toBe(10);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe("ClaudeProvider", () => {
  it("rejects embedding capability", async () => {
    const provider = new ClaudeProvider({ apiKey: "key" });
    await expect(provider.embedding("hello")).rejects.toBeInstanceOf(AiCapabilityUnsupportedError);
  });
});

describe("AiRouter", () => {
  it("routes via provider.chat()", async () => {
    const registry = new AIProviderRegistry();
    registry.register(new MockProvider({ fixedContent: "from mock" }));

    const router = new AiRouter(registry, {
      defaultProvider: "mock",
      fallbackProviders: [],
    });

    const result = await router.generate({
      messages: [{ role: "user", content: "test" }],
    });

    expect(result.content).toBe("from mock");
    expect(result.provider).toBe("mock");
  });

  it("falls back when primary fails", async () => {
    const registry = new AIProviderRegistry();
    registry.register(
      new OpenAIProvider({
        apiKey: "key",
        fetchImpl: vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          headers: { get: () => null },
          json: async () => ({}),
        }) as unknown as typeof fetch,
      }),
    );
    registry.register(new MockProvider({ fixedContent: "fallback ok" }));

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
    const registry = new AIProviderRegistry();
    registry.register(new MockProvider({ shouldFail: true }));

    const router = new AiRouter(registry, { defaultProvider: "mock" });

    await expect(
      router.generate({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toBeInstanceOf(AiRouterExhaustedError);
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
