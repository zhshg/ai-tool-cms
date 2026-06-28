# @ai-tool-cms/config

集中管理环境变量，使用 Zod 校验与类型推导。

**约定：** 业务代码统一通过 `import { env } from "@ai-tool-cms/config"` 读取配置；禁止在 App / 共享包中散落 `process.env.xxx`（仅本包 `parse.ts` 可读取 `process.env`）。

## 用法

```typescript
import { env } from "@ai-tool-cms/config";

const dbUrl = env.DATABASE_URL;
const redisUrl = env.REDIS_URL;
const meiliUrl = env.MEILI_URL;
const openaiKey = env.OPENAI_API_KEY;
const geminiKey = env.GEMINI_API_KEY;
const anthropicKey = env.ANTHROPIC_API_KEY;
const jwtSecret = env.JWT_SECRET;
```

`env` 为模块加载时解析的单例。`parseEnv()` 会自动从 monorepo 根目录加载 `.env`（无需等待 Nest/Next 的 ConfigModule）。测试中可调用 `resetEnv()` 后使用 `getEnv(customSource)` 重新解析。

客户端组件请使用 `@ai-tool-cms/config/client`（仅 `NEXT_PUBLIC_*`，无 Node 依赖）：

```typescript
import { clientEnv } from "@ai-tool-cms/config/client";
```

## 核心环境变量

| 字段 | 环境变量 |
|---|---|
| `DATABASE_URL` | `DATABASE_URL` |
| `REDIS_URL` | `REDIS_URL` |
| `MEILI_URL` | `MEILI_URL`, `MEILISEARCH_URL`, `MEILISEARCH_HOST` |
| `OPENAI_API_KEY` | `OPENAI_API_KEY`, `OPENAI_KEY` |
| `GEMINI_API_KEY` | `GEMINI_API_KEY`, `GOOGLE_API_KEY` |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` |
| `JWT_SECRET` | `JWT_SECRET` |
| `PORT` | `PORT`, `API_PORT` |
| `LOG_LEVEL` | `LOG_LEVEL` |
| `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_APP_URL`, `APP_URL` |
| `NEXT_PUBLIC_ADMIN_MOCK_ROLE` | `NEXT_PUBLIC_ADMIN_MOCK_ROLE` |

完整列表见根目录 `.env.example`。

## 脚本

```bash
pnpm --filter @ai-tool-cms/config build
pnpm --filter @ai-tool-cms/config typecheck
```

## 目录结构

```
packages/config/
├── src/
│   ├── schema.ts    # Zod schema + Env 类型
│   ├── parse.ts     # process.env → 校验后的 env
│   └── index.ts     # 导出 env / getEnv / resetEnv
├── package.json
└── tsconfig.json
```

## 消费者

| App | 用法 |
|---|---|
| `apps/api` | `import { env } from "@ai-tool-cms/config"` |
| `apps/web` | SEO、站点 URL 等 |
| `apps/admin` | Mock RBAC 角色等 |
| `packages/database` | `NODE_ENV` 判断开发态单例 |
| `packages/logger` | 由调用方传入 `env.LOG_LEVEL` |

各 App 启动前需加载根目录 `.env`（Next.js / Nest `ConfigModule` 会自动处理）。
