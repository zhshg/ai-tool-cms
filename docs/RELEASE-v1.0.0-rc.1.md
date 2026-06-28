# AI Tool CMS v1.0.0-rc.1

## Platform Architecture

```
                AI Tool Platform
                     Database
                         │
     ┌────────────┬──────────────┬────────────┬────────────┐
     ▼            ▼              ▼            ▼            ▼
   Website    REST API v1    MCP Server    Webhook Hub    SDK
```

## Quick Start

### 1. Infrastructure
```bash
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
```

### 2. Public API
Create API key in Admin → Platform, then:
```bash
curl -H "X-Api-Key: atcms_..." http://localhost:4000/v1/api/v1/tools
```

### 3. TypeScript SDK
```typescript
import { ToolCMSClient } from "@ai-tool-cms/sdk";

const client = new ToolCMSClient({
  apiKey: process.env.TOOLCMS_API_KEY!,
  baseUrl: "http://localhost:4000/v1/api/v1",
});

const results = await client.search({ q: "image generation" });
const tool = await client.getTool("chatgpt");
```

### 4. MCP (Cursor / Claude Desktop)
```bash
pnpm mcp
```
Config: `packages/mcp-server/mcp-config.example.json`

### 5. Webhooks
Register at `POST /v1/platform/webhooks`, events: ToolCreated, ToolUpdated, ToolDeleted, CrawlerCompleted, AICompleted, SEOCompleted.

## Migration from Sprint 9

1. Run migration: `pnpm db:migrate:deploy`
2. Bootstrap workflows: call `ensureDefaultWorkflows` or seed
3. Configure `OTEL_EXPORTER_OTLP_ENDPOINT` / `SENTRY_DSN` for observability

## API Documentation

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `WRITE_OPENAPI=true pnpm --filter @ai-tool-cms/api build`

## Docker Production

```bash
docker compose -f docker-compose.yml up -d
# Build API image: docker build --build-arg APP_NAME=api -f docker/Dockerfile .
```

## Known Limitations (rc.1)

- GraphQL deferred to Sprint 11
- Workflow drag-and-drop UI not included (definitions via DB/API)
- Rate limit is in-memory (use Redis in production)
- Public API path is `/v1/api/v1/*` — configure gateway rewrite to `/api/v1/*`
