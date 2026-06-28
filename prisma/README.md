# Prisma Schema v1

AI Tool CMS 核心数据模型（PostgreSQL）。一次性基线设计，尽量避免后续破坏性 migration。

## 设计约定（每个模型）

| 字段 | 说明 |
|------|------|
| `id` | UUID 主键 |
| `createdAt` / `updatedAt` / `deletedAt` | 时间戳 + 软删除 |
| `metadata` | JSON 扩展字段 |
| `slug` | 公开可寻址实体（工具、分类、标签等） |
| `createdById` / `updatedById` / `deletedById` | 可审计领域模型的操作者追踪 |
| 外键 | 全部建立 `@@index` |
| 注释 | 每个模型均有 `///` 文档注释 |

**Slug 唯一性**：通过 migration 中的部分唯一索引（`WHERE deleted_at IS NULL`）保证活跃记录 slug 唯一，软删除后可复用 slug。

**审计**：`AuditLog` 为 append-only 事件流；领域模型通过 `createdById` 等字段 + `AuditLog` 双重支撑。

## 模型分组

| 分组 | 模型 |
|------|------|
| 身份与权限 | `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `ApiKey` |
| 工具目录 | `Category`, `Tool`, `ToolCategory`, `Tag`, `ToolTag`, `PricingPlan`, `ToolVersion` |
| 内容与社区 | `Review`, `ReviewVote`, `Faq`, `Prompt`, `PromptCategory`, `Collection`, `CollectionItem`, `Favorite` |
| 运营与系统 | `CrawlSource`, `CrawlJob`, `SeoMetadata`, `AiGenerationTask`, `AuditLog`, `Setting` |

## 关系概览

```
Category ── ToolCategory ── Tool ──┬── PricingPlan
                                   ├── ToolVersion
                                   ├── Review ── ReviewVote
                                   ├── Faq
                                   ├── Prompt ── PromptCategory
                                   └── ToolTag ── Tag

User ──┬── UserRole ── Role ── RolePermission ── Permission
       ├── Review / Favorite / Collection / ApiKey
       └── AuditLog
```

## 命令

```bash
pnpm db:generate
pnpm db:migrate          # 开发迁移（需 Postgres：pnpm docker:up）
pnpm db:migrate:deploy   # 生产部署
pnpm db:studio
```

`DATABASE_URL` 由 `@ai-tool-cms/config` 从根目录 `.env` 加载。

## Seed（Commit 012 / 020）

```bash
pnpm db:seed                    # demo：Admin + 5 Category + 8 Tag + 10 Tool
SEED_PROFILE=bulk pnpm db:seed  # 100 Category / 500 Tag / 100 Tool / 50 Prompt / 20 FAQ
SEED_PROFILE=all pnpm db:seed     # demo + bulk
```

默认管理员：`admin@ai-tool-cms.local` / `Admin123!`（可通过 `SEED_ADMIN_*` 覆盖）。
