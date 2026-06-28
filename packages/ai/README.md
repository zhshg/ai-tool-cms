# @ai-tool-cms/ai

Unified AI Provider layer (Commit 031, RFC-0003). **Business code must not call OpenAI or other vendor APIs directly.**

## Interface

```ts
interface AIProvider {
  chat(input: ChatRequest): Promise<ChatResponse>;
  embedding(input: string, model?: string): Promise<number[]>;
  image?(input: ImageRequest): Promise<ImageResponse>;
  moderation?(input: ModerationRequest): Promise<ModerationResponse>;
}
```

## Providers

| File | Id | Notes |
|------|-----|-------|
| `OpenAIProvider.ts` | `openai` | Chat, embedding, image, moderation |
| `GeminiProvider.ts` | `gemini` | Chat, embedding |
| `ClaudeProvider.ts` | `claude` | Chat only |
| `DeepSeekProvider.ts` | `deepseek` | OpenAI-compatible chat + embedding |
| `MockProvider.ts` | `mock` | Local dev / tests |

## Switch provider without changing business code

```ts
import { AIFactory } from "@ai-tool-cms/ai";

const openai = AIFactory.create("openai");
const gemini = AIFactory.create("gemini");

const result = await openai.chat({
  messages: [{ role: "user", content: "Write a tool summary" }],
});
```

## Router (failover)

```ts
import { createAiRouterFromEnv } from "@ai-tool-cms/ai";

const router = createAiRouterFromEnv();
const result = await router.generate({ messages: [...] });
```

## Environment

| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | openai |
| `GEMINI_API_KEY` | gemini |
| `ANTHROPIC_API_KEY` | claude |
| `DEEPSEEK_API_KEY` | deepseek |

Without keys, `AIFactory.createDefault()` uses `mock`.

## Architecture rule

LLM output must not auto-publish. Commit 032+ wires queue + human review gate.
