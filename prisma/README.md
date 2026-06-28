# Prisma Schema v1

AI Tool CMS 核心数据模型（PostgreSQL）。设计原则：UUID 主键、软删除、`metadata` JSON 扩展、外键索引、Slug 唯一约束。

## 模型分组

| 分组 | 模型 |
|------|------|
| 身份与权限 | `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `ApiKey` |
| 工具目录 | `Category`, `Tool`, `ToolCategory`, `Tag`, `ToolTag`, `PricingPlan`, `ToolVersion` |
| 内容与社区 | `Review`, `ReviewVote`, `Prompt`, `PromptCategory`, `FAQ`, `Collection`, `CollectionItem`, `Favorite` |
| 运营与系统 | `CrawlSource`, `CrawlJob`, `SeoMetadata`, `AiGenerationTask`, `AuditLog`, `Setting` |

## 关系概览

```
Category ── ToolCategory ── Tool ──┬── PricingPlan
                                   ├── ToolVersion
                                   ├── Review ── ReviewVote
                                   ├── FAQ
                                   ├── Prompt ── PromptCategory
                                   └── ToolTag ── Tag

User ──┬── UserRole ── Role ── RolePermission ── Permission
       ├── Review / Favorite / Collection / ApiKey
       └── AuditLog
```

## 命令

```bash
# 生成 Client
pnpm db:generate

# 开发迁移（需 Postgres 运行：pnpm docker:up）
pnpm db:migrate

# 生产部署迁移
pnpm db:migrate:deploy

# 可视化浏览数据
pnpm db:studio
```

`DATABASE_URL` 由 `@ai-tool-cms/config` 从根目录 `.env` 加载。
