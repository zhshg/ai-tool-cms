# Sequence: AI Pipeline

> **Document Type:** Interaction Sequence  
> **Version:** 2.0.0  
> **Status:** Draft

---

## 1. AI Content Generation (Happy Path)

```mermaid
sequenceDiagram
    participant ED as Editor
    participant ADM as apps/admin
    participant API as apps/api
    participant Q as BullMQ
    participant WRK as apps/worker
    participant AI as packages/ai
    participant LLM as LLM Provider
    participant PG as PostgreSQL

    ED->>ADM: Click "Generate description"
    ADM->>API: POST /v1/tools/:id/ai/generate
    API->>Q: AIGenerationRequested
    API-->>ADM: 202 { jobId }
    Q->>WRK: consume
    WRK->>PG: Load tool + prompt template
    WRK->>AI: generate(prompt, modelPolicy)
    AI->>LLM: HTTPS completion API
    LLM-->>AI: completion text
    AI-->>WRK: GeneratedContent
    WRK->>PG: INSERT content_revision PENDING
    WRK->>PG: UPDATE ai_job COMPLETED
    ADM->>API: GET review queue
    API-->>ADM: Show diff for approval
    ED->>ADM: Approve
    ADM->>API: POST approve revision
    API->>PG: Apply to tool fields (still DRAFT until publish)
```

---

## 2. Provider Routing

```mermaid
flowchart LR
    REQ[Generate request] --> ROUTER[AiRouter]
    ROUTER --> P1[OpenAI]
    ROUTER --> P2[Claude]
    ROUTER --> P3[Gemini]
    ROUTER --> P4[OpenRouter]
    CONFIG[AiProviderConfig] --> ROUTER
```

| Policy | Behavior |
|---|---|
| Default model | From Admin settings |
| Failover | Try secondary provider on 5xx |
| Disable provider | Admin toggle skips provider |

---

## 3. Prompt Template Resolution

| Input | Source |
|---|---|
| System prompt | `prompt_templates` table |
| Tool context | name, website, category, existing fields |
| Output schema | JSON or markdown per job type |

---

## 4. Human Review Gate

**Architecture rule:** No worker path may set `Tool.status = PUBLISHED` from AI output alone.

| Step | Actor |
|---|---|
| Generate | Worker (automated) |
| Review | Editor (human) |
| Publish | Editor explicit action |

See [RFC/RFC-0003-ai-pipeline.md](../RFC/RFC-0003-ai-pipeline.md).

---

## 5. Failure and Retry

```mermaid
sequenceDiagram
    participant WRK as worker
    participant AI as packages/ai
    participant LLM as LLM Provider
    participant Q as BullMQ

    WRK->>AI: generate()
    AI->>LLM: request
    LLM-->>AI: 503 error
    AI-->>WRK: throw retryable
    WRK->>Q: fail job attempt 1
    Note over Q: exponential backoff
    Q->>WRK: retry attempt 2
```

| Failure type | Action |
|---|---|
| Rate limit 429 | Backoff per provider headers |
| Content policy violation | Fail job; no retry; log |
| Invalid JSON output | Retry up to N with repair prompt |
| Max attempts exceeded | Dead letter + Admin alert |

---

## 6. Cost and Observability

| Metric | Logged |
|---|---|
| `provider` | per job |
| `model` | per job |
| `inputTokens` / `outputTokens` | per job |
| `latencyMs` | per job |
| `estimatedCost` | optional |

---

## Related Documents

- [RFC/RFC-0003-ai-pipeline.md](../RFC/RFC-0003-ai-pipeline.md)
- [EventFlow.md](../EventFlow.md)
- [DDD.md](../DDD.md) — Automation context
