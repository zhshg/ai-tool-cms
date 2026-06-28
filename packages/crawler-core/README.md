# @ai-tool-cms/crawler-core

Crawler **SDK**（非具体爬虫实现）。所有站点适配器通过 `extends BaseCrawler` / `extends BaseAdapter` 接入。

对齐 [RFC-0002](../../docs/01-architecture/RFC/RFC-0002-crawler.md)。

## 架构

```
CrawlJob → BaseCrawler → CrawlPipeline
              │
              ├── Adapter.fetch()   → CrawlRawPage[]
              ├── Extractor         → CrawlExtractedItem[]
              ├── Normalizer        → NormalizedToolDraft[]
              ├── RateLimiter / Retry / Proxy
              └── Storage / Queue / Logger
```

## 模块

| 文件 | 职责 |
|------|------|
| `Crawler.ts` | `BaseCrawler` — 所有站点爬虫基类 |
| `Adapter.ts` | `CrawlerAdapter` / `BaseAdapter` / `AdapterRegistry` |
| `Request.ts` | 出站 HTTP 请求描述 + `HttpFetcher` 注入点 |
| `Response.ts` | 原始响应 / `CrawlRawPage` |
| `Extractor.ts` | 从 HTML/JSON 提取结构化记录 |
| `Normalizer.ts` | → `NormalizedToolDraft`（RFC-0002） |
| `Pipeline.ts` | fetch → extract → normalize 编排 |
| `RateLimiter.ts` | 礼貌爬取 / 限速 |
| `Proxy.ts` | 代理配置 |
| `Retry.ts` | 指数退避重试 |
| `Logger.ts` | 封装 `@ai-tool-cms/logger` |
| `Queue.ts` | 任务队列抽象（生产环境由 BullMQ 实现） |
| `Storage.ts` | 原始页缓存抽象 |

## 快速开始

```typescript
import {
  BaseAdapter,
  BaseCrawler,
  createCrawlRequest,
  type CrawlRawPage,
  type CrawlerContext,
  type HttpFetcher,
} from "@ai-tool-cms/crawler-core";

// 1. 站点 Adapter
class ToolifyAdapter extends BaseAdapter {
  readonly sourceId = "toolify";
  readonly displayName = "Toolify";

  async fetch(cursor, ctx) {
    const request = createCrawlRequest("https://toolify.ai/api/tools", { cursor });
    const response = await ctx.fetch(ctx.proxy.apply(request));
    return [{ ...response, sourceId: this.sourceId }];
  }
}

// 2. 站点 Crawler
class ToolifyCrawler extends BaseCrawler {
  constructor(fetch: HttpFetcher) {
    super({
      adapter: new ToolifyAdapter(),
      contextOptions: { fetch, sourceId: "toolify" },
    });
  }
}

// 3. 执行
const result = await new ToolifyCrawler(globalThis.fetch).crawl();
// result.drafts → NormalizedToolDraft[]（状态仍为 DRAFT，不自动发布）
```

## Mock 适配器

```bash
pnpm --filter @ai-tool-cms/crawler-core test
```

内置 `MockCrawler` + `MockAdapter` 用于无网络集成测试。

## 设计原则

- **SDK only** — 不绑定 Playwright/Cheerio；HTTP 由 `HttpFetcher` 注入
- **不直写数据库** — 输出 `NormalizedToolDraft`，由 `apps/crawler` / API Ingestion 落库
- **不自动发布** — 爬虫永远不设置 `PUBLISHED`
- **可插拔** — `AdapterRegistry` 注册 Toolify / Futurepedia / OpenTools / AIBase / Product Hunt 等
