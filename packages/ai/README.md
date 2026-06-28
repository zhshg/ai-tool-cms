# @ai-tool-cms/ai

LLM provider abstraction for the AI Pipeline (Commit 031, RFC-0003).

## Features

- **Provider interface** — `AiProvider` with `OpenAiProvider` + `MockAiProvider`
- **Router** — default provider, fallback chain, disabled kill-switch, `maxTokensPerJob`
- **Safety** — PII scrubbing, max output length
- **Token tracking** — `promptTokens`, `completionTokens`, `estimatedCostUsd`

## Usage

```ts
import { createAiRouterFromEnv } from "@ai-tool-cms/ai";

const router = createAiRouterFromEnv();

const result = await router.generate({
  messages: [
    { role: "system", content: "You write concise tool descriptions." },
    { role: "user", content: "Tool: ChatGPT. Website: https://chat.openai.com" },
  ],
  options: { maxTokens: 800, maxOutputChars: 2000 },
});

console.log(result.content, result.usage);
```

Without `OPENAI_API_KEY`, the router defaults to `mock` for local development.

## Architecture rule

> LLM output must not auto-publish. Workers write to `ContentRevision` (PENDING) — see RFC-0003.

## Next (Commit 032+)

- `ai-generation` BullMQ queue
- Worker handler for `GENERATE_DESCRIPTION`
- Admin review UI
