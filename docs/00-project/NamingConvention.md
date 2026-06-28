# Naming Convention

> **Document Type:** Engineering Standards  
> **Version:** 2.0.0  
> **Status:** Draft  
> **Owner:** Project Architecture Team  
> **Last Updated:** 2026  
> **Audience:** Software Engineers, Open Source Contributors, AI Coding Assistants (Cursor, Claude Code, GitHub Copilot)

---

## Table of Contents

1. [Purpose](#purpose)
2. [General Naming Principles](#1-general-naming-principles)
3. [Repository Naming](#2-repository-naming)
4. [Folder Naming](#3-folder-naming)
5. [File Naming](#4-file-naming)
6. [TypeScript Naming](#5-typescript-naming)
7. [React Naming](#6-react-naming)
8. [NestJS Naming](#7-nestjs-naming)
9. [Prisma Naming](#8-prisma-naming)
10. [API Naming](#9-api-naming)
11. [Database Naming](#10-database-naming)
12. [Environment Variables](#11-environment-variables)
13. [Git Naming](#12-git-naming)
14. [SEO Naming](#13-seo-naming)
15. [AI Naming](#14-ai-naming)
16. [Reserved Words](#15-reserved-words)
17. [Naming Checklist](#16-naming-checklist)
18. [Good vs Bad Examples](#17-good-vs-bad-examples)

---

## Purpose

Naming is one of the highest-leverage design decisions in a large-scale monorepo. AI Tool CMS v2 spans multiple applications, shared packages, database schemas, REST APIs, background workers, crawlers, SEO surfaces, and AI pipelines. Without consistent naming, contributors cannot predict where code lives, how entities relate, or what a symbol represents across layers.

Inconsistent naming compounds over time: search becomes unreliable, imports break during refactors, AI assistants hallucinate incorrect paths, and onboarding cost grows with every new module. Conversely, a disciplined naming system makes the codebase **self-documenting**—a developer who knows the convention can locate `ToolsService`, `tools` table, `/tools` endpoint, and `tool-detail-page` without exploring the tree.

### Objectives

| Objective | Description |
|---|---|
| **Readability** | Names communicate intent without opening implementation files |
| **Predictability** | Given a concept, any contributor infers file path, class name, and API path |
| **Scalability** | Conventions hold from ten modules to ten thousand pages and hundreds of packages |
| **Maintainability** | Refactors and global renames are mechanical because patterns are uniform |
| **AI-friendly code generation** | Assistants generate correct symbols when rules are explicit and consistent |

This document is the authoritative reference for naming across the repository. When it conflicts with personal habit, **this document wins**. Related standards: [CodingStandards.md](./CodingStandards.md), [FolderStructure.md](./FolderStructure.md).

### Why AI Assistants Depend on Naming

AI coding tools infer file paths, imports, and symbols from patterns in training data and repository context. Predictable naming reduces incorrect file creation (`ToolService.ts` vs `tools.service.ts`), wrong API paths (`/tool` vs `/tools`), and hallucinated package names (`@ai-tool-cms/seo-utils` vs `@ai-tool-cms/seo`). Explicit conventions in this document are included in `.cursor/rules/` so assistants load them before generating code.

### Cross-Reference Map

| If you are naming… | See section |
|---|---|
| A new npm package | [Repository Naming](#2-repository-naming), [Folder Naming](#3-folder-naming) |
| A NestJS feature | [NestJS Naming](#7-nestjs-naming), [File Naming](#4-file-naming) |
| A database table | [Database Naming](#10-database-naming), [Prisma Naming](#8-prisma-naming) |
| A public URL | [SEO Naming](#13-seo-naming), [API Naming](#9-api-naming) |
| An env var | [Environment Variables](#11-environment-variables) |
| A BullMQ job | [AI Naming](#14-ai-naming) |

```mermaid
flowchart LR
    CONCEPT[Business Concept<br/>e.g. Tool] --> CODE[Code: ToolService]
    CONCEPT --> DB[(DB: tools)]
    CONCEPT --> API[/api/v1/tools]
    CONCEPT --> URL[/tools/chatgpt]
    CONCEPT --> SEO[slug: chatgpt]
```

---

## 1. General Naming Principles

### Use Meaningful Names

Names should answer **what** something is or **what** it does without requiring comments.

| Good | Bad |
|---|---|
| `publishedToolCount` | `cnt` |
| `fetchToolsByCategory` | `getData` |
| `CrawlerJobPayload` | `obj` |

### Avoid Abbreviations

Do not shorten words unless the abbreviation is universally understood in context (`id`, `url`, `api`, `dto`).

| Acceptable | Unacceptable |
|---|---|
| `api`, `id`, `url`, `seo`, `jwt` | `mgr`, `proc`, `cfg` (use `manager`, `process`, `config`) |
| `dto`, `rbac` (documented acronyms) | `tbl`, `usr`, `cat` (use full words) |
| `cuid` (identifier format) | `gen`, `desc`, `attr` |

When introducing a new abbreviation, document it once in `docs/00-project/` or the relevant package README—then use it consistently. Never invent per-file abbreviations.

### Consistency Across Layers

One business concept uses **one canonical name** everywhere:

| Layer | Canonical Example for "Tool" |
|---|---|
| Prisma model | `Tool` |
| Database table | `tools` |
| API path | `/tools` |
| Service class | `ToolsService` |
| React page folder | `tools/` |
| SEO slug field | `slug` on tool record |

Do not call the same concept `product`, `item`, and `tool` in different layers.

### One Concept, One Name

Avoid synonyms for the same entity in code. Pick the domain term from `spec/` and use it consistently.

- **Tool** — not Product, Item, App (unless spec defines a distinct Product entity)
- **Category** — not Group, Folder, Section
- **Tag** — not Label, Keyword (Tag is the spec term)

### Prefer Nouns for Entities

Entities, models, types, and components name **things**:

- `Tool`, `Category`, `PromptTemplate`, `ToolCard`

### Prefer Verbs for Actions

Functions, methods, and job handlers name **actions**:

- `createTool`, `publishTool`, `crawlSource`, `buildMetadata`, `enqueueIndexJob`

### Boolean Prefixes

| Prefix | Usage | Example |
|---|---|---|
| `is` | State | `isPublished`, `isActive` |
| `has` | Possession | `hasPermission`, `hasLogo` |
| `can` | Capability | `canEdit`, `canPublish` |
| `should` | Recommendation | `shouldIndex`, `shouldRetry` |

### Case Summary

| Context | Case |
|---|---|
| TypeScript variables, functions | camelCase |
| TypeScript types, interfaces, classes | PascalCase |
| Constants | SCREAMING_SNAKE_CASE |
| Files and folders | kebab-case |
| Database tables and columns | snake_case |
| Environment variables | SCREAMING_SNAKE_CASE |
| REST URL paths | kebab-case, plural nouns |
| Docker image tags | kebab-case or semver |

---

## 2. Repository Naming

### GitHub Repository

| Element | Convention | Example |
|---|---|---|
| **Repository name** | kebab-case, product name | `ai-tool-cms` |
| **Description** | Sentence case, concise | Enterprise AI tool directory and CMS platform |
| **Default branch** | `main` | — |

### Monorepo Root

| Element | Convention | Example |
|---|---|---|
| **Root package name** | kebab-case in `package.json` | `ai-tool-cms` |
| **Workspace packages** | Scoped npm name | `@ai-tool-cms/web`, `@ai-tool-cms/seo` |

### Apps

| App | Package Name | Directory |
|---|---|---|
| Public website | `@ai-tool-cms/web` | `apps/web/` |
| Admin dashboard | `@ai-tool-cms/admin` | `apps/admin/` |
| REST API | `@ai-tool-cms/api` | `apps/api/` |
| Crawler service | `@ai-tool-cms/crawler` | `apps/crawler/` |
| Background worker | `@ai-tool-cms/worker` | `apps/worker/` |
| Scheduler | `@ai-tool-cms/scheduler` | `apps/scheduler/` |
| Documentation site | `@ai-tool-cms/docs` | `apps/docs/` |

App names are **single lowercase nouns**—no `web-app`, `api-server`.

### Packages

| Package | Directory | Scope Name |
|---|---|---|
| UI components | `packages/ui/` | `@ai-tool-cms/ui` |
| Database client | `packages/database/` | `@ai-tool-cms/database` |
| SEO utilities | `packages/seo/` | `@ai-tool-cms/seo` |
| Crawler core | `packages/crawler-core/` | `@ai-tool-cms/crawler-core` |

Multi-word packages use **kebab-case** in directory and scope suffix.

### Docker Images

| Image | Tag Pattern | Example |
|---|---|---|
| API | `ai-tool-cms-api:{version}` | `ai-tool-cms-api:2.0.0` |
| Web | `ai-tool-cms-web:{version}` | `ai-tool-cms-web:2.0.0` |
| Worker | `ai-tool-cms-worker:{version}` | `ai-tool-cms-worker:2.0.0` |

- Lowercase, kebab-case, hyphen-separated product and app name
- Version tags follow SemVer; `latest` only for development

### Docker Containers

| Service | Container Name |
|---|---|
| PostgreSQL | `ai-tool-cms-postgres` |
| Redis | `ai-tool-cms-redis` |
| Nginx | `ai-tool-cms-nginx` |
| Meilisearch | `ai-tool-cms-meilisearch` |

Pattern: `{repo-name}-{service}`

### Docker Networks and Volumes

| Type | Convention | Example |
|---|---|---|
| **Network** | `{repo-name}-network` | `ai-tool-cms-network` |
| **Volume** | `{repo-name}-{service}-data` | `ai-tool-cms-postgres-data` |

---

## 3. Folder Naming

### Rules

| Rule | Detail |
|---|---|
| **lowercase** | Never `Apps`, `Packages`, `Tools` |
| **kebab-case** | Multi-word: `crawler-core`, `online-tools` |
| **No spaces** | Never `tool category` |
| **No plural unless necessary** | `spec/tool.md` (singular spec); `migrations/` (collection) |
| **Feature-first** | `tools/`, `categories/`, not `controllers/` at app root |

### Apps

```
apps/web/src/app/tools/[slug]/
apps/api/src/tools/
apps/admin/src/app/(dashboard)/tools/
```

### Packages

```
packages/crawler-core/src/adapters/github/
packages/seo/src/
```

### Documentation

```
docs/00-project/
docs/09-seo/
spec/tool.md
```

Numbered doc prefixes use **two digits** and **kebab-case** suffix: `01-architecture`, not `1_arch`.

### Anti-patterns

| Bad | Good |
|---|---|
| `apps/web/src/ToolPages/` | `apps/web/src/app/tools/` |
| `packages/SEO/` | `packages/seo/` |
| `misc/` | `common/` or specific domain name |
| `utils2/` | `utils/` or domain-specific package |

---

## 4. File Naming

### Summary Table

| File Type | Convention | Example |
|---|---|---|
| **React components** | kebab-case or PascalCase (consistent per app) | `tool-card.tsx`, `ToolCard.tsx` |
| **Hooks** | kebab-case with `use-` prefix | `use-tool-search.ts` |
| **Utilities** | kebab-case | `slug-utils.ts`, `format-date.ts` |
| **Services** | kebab-case + `.service` | `tools.service.ts` |
| **Repositories** | kebab-case + `.repository` | `tool.repository.ts` |
| **Controllers** | kebab-case + `.controller` | `tools.controller.ts` |
| **DTOs** | kebab-case + `.dto` | `create-tool.dto.ts` |
| **Entities** | kebab-case (if separate from Prisma) | `tool.entity.ts` |
| **Tests** | same base + `.spec.ts` | `tools.service.spec.ts` |
| **Config files** | kebab-case or ecosystem default | `next.config.ts`, `tailwind.config.ts` |
| **Environment files** | dot-prefixed standard | `.env`, `.env.example`, `.env.local` |
| **Markdown docs** | PascalCase or kebab-case per doc type | `README.md`, `TechStack.md`, `tool.md` |

### React Components

Next.js App Router special files use **framework conventions**:

| File | Purpose |
|---|---|
| `page.tsx` | Route page |
| `layout.tsx` | Shared layout |
| `loading.tsx` | Loading UI |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 UI |
| `route.ts` | Route handler (API) |

Custom components: `tool-card.tsx` exporting `ToolCard`.

### NestJS Module Files

```
tools.module.ts
tools.controller.ts
tools.service.ts
dto/create-tool.dto.ts
dto/update-tool.dto.ts
dto/query-tools.dto.ts
```

### Test Files

- Unit/integration: `tools.service.spec.ts` adjacent to source
- E2E: `tests/e2e/admin-tool-crud.spec.ts` or `e2e/tools.spec.ts`

### Config and Environment

| File | Purpose |
|---|---|
| `.env.example` | Documented template (committed) |
| `.env` | Local secrets (gitignored) |
| `.env.test` | Test environment |
| `docker-compose.yml` | Root orchestration |
| `turbo.json` | Turborepo pipeline |

Never commit `.env` with real secrets.

---

## 5. TypeScript Naming

### Variables

- **camelCase**
- Descriptive nouns or noun phrases

```typescript
const toolCount = 42;
const activeCategorySlug = 'text-generation';
```

### Constants

- **SCREAMING_SNAKE_CASE** for true constants
- Exported config maps may use camelCase if mutable object (prefer `as const`)

```typescript
const MAX_PAGE_SIZE = 100;
const DEFAULT_LOCALE = 'en';
```

### Functions

- **camelCase**, verb-first

```typescript
function buildToolSlug(name: string): string { ... }
function getToolsByCategory(categoryId: string): Promise<Tool[]> { ... }
```

### Async Functions

- Same as functions—no `async` prefix in name
- Prefer `fetch`, `load`, `create`, `update`, `delete`, `build`, `parse`

```typescript
async function fetchPublishedTools(): Promise<Tool[]> { ... }
```

### Interfaces

- **PascalCase**
- No `I` prefix
- Noun or adjective + noun

```typescript
interface ToolResponse { ... }
interface PaginatedResult<T> { ... }
interface CreateToolInput { ... }
```

### Types

- **PascalCase**
- Use for unions, utilities, mapped types

```typescript
type ToolStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

### Generic Types

- Single letter for simple cases: `T`, `K`, `V`
- Descriptive for complex APIs: `TEntity`, `TResponse`, `TError`

```typescript
function paginate<TItem>(items: TItem[], page: number): PaginatedResult<TItem>
```

### Enums (Discouraged)

Avoid TypeScript `enum`. Use const object + union:

```typescript
const ToolPricing = {
  Free: 'FREE',
  Freemium: 'FREEMIUM',
  Paid: 'PAID',
} as const;

type ToolPricing = (typeof ToolPricing)[keyof typeof ToolPricing];
```

Exception: Prisma-generated enums from schema.

### Namespaces (Forbidden)

Do not use `namespace`. Use ES modules.

---

## 6. React Naming

### Components

- **PascalCase** symbol: `ToolCard`, `CategoryNav`, `JsonLd`
- File: `tool-card.tsx` or `ToolCard.tsx` (match app convention)

### Layouts

- Suffix with `Layout` when not route `layout.tsx`

```typescript
function DashboardLayout({ children }: { children: React.ReactNode }) { ... }
```

### Pages

- App Router: folder defines route; `page.tsx` exports default component
- Component name optional; if named: `ToolsPage`, `ToolDetailPage`

### Hooks

- **camelCase**, `use` prefix: `useToolSearch`, `useAuth`, `useDebounce`

### Providers

- Suffix `Provider`: `AuthProvider`, `QueryProvider`, `ThemeProvider`

### Context

- Context object: `AuthContext`, `ThemeContext`
- Hook accessor: `useAuthContext` or `useAuth` (preferred shorter if clear)

### Stores (if used)

- Zustand or similar: `useToolStore`, file `tool-store.ts`

### Props Types

- Component name + `Props`: `ToolCardProps`, `DashboardLayoutProps`

```typescript
interface ToolCardProps {
  tool: ToolResponse;
  showPricing?: boolean;
}
```

---

## 7. NestJS Naming

### Modules

- **PascalCase** + `Module`: `ToolsModule`, `AuthModule`, `SearchModule`
- File: `tools.module.ts`

### Controllers

- **PascalCase** + `Controller`: `ToolsController`
- Route prefix plural: `@Controller('tools')`
- File: `tools.controller.ts`

### Services

- **PascalCase** + `Service`: `ToolsService`, `CrawlerDispatchService`
- File: `tools.service.ts`

### Repositories

- **PascalCase** + `Repository` (when extracted): `ToolRepository`
- File: `tool.repository.ts`

### Guards

- **PascalCase** + `Guard`: `JwtAuthGuard`, `PermissionsGuard`, `RolesGuard`

### Interceptors

- **PascalCase** + `Interceptor`: `LoggingInterceptor`, `TransformInterceptor`

### Pipes

- **PascalCase** + `Pipe`: `ParseCuidPipe`, `ValidationPipe` (global)

### Filters

- **PascalCase** + `Filter` / `ExceptionFilter`: `HttpExceptionFilter`, `AllExceptionsFilter`

### Decorators

- **PascalCase** + `Decorator` or descriptive: `@CurrentUser()`, `@RequirePermissions()`
- Custom decorator factories: camelCase function `RequirePermissions`, PascalCase metadata key

### DTOs

- **PascalCase** + `Dto`: `CreateToolDto`, `UpdateToolDto`, `QueryToolsDto`, `ToolResponseDto`

---

## 8. Prisma Naming

### Models

- **PascalCase**, singular: `Tool`, `Category`, `ToolCategory`, `RefreshToken`

### Fields

- **camelCase** in schema with `@map("snake_case")` for database columns

```prisma
model Tool {
  id          String   @id @default(cuid())
  slug        String   @unique
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime @default(now()) @map("created_at")
}
```

### Relations

- **camelCase**, plural for collections: `categories`, `tags`, `tools`
- Junction models: `ToolCategory`, `ToolTag` with explicit `toolId`, `categoryId`

### Join Tables

- Table name: snake_case plural phrase: `tool_categories`, `tool_tags`
- Model name: `ToolCategory` (PascalCase singular compound)

### Indexes

- Prisma `@@index` on field list; migration SQL may name: `tools_status_published_at_idx`

### Migrations

- Directory: timestamp + descriptive snake_case: `20260115120000_add_tool_pricing_enum/`
- Descriptive slug: `add_tool_tags`, `init_rbac_tables`

### Seed Files

- `prisma/seed.ts` — main seed entry
- `prisma/seeds/` — optional split seeds: `roles.ts`, `categories.ts`

---

## 9. API Naming

### REST Endpoints

| Rule | Example |
|---|---|
| Plural nouns | `/tools`, `/categories`, `/tags` |
| kebab-case multi-word | `/tool-categories`, `/online-tools` |
| Nested one level | `/tools/:toolId/categories` |
| No verbs in path | `/tools`, not `/getTools` or `/createTool` |
| Version prefix | `/v1/tools` |

### HTTP Methods and Paths

| Operation | Method | Path |
|---|---|---|
| List | `GET` | `/v1/tools` |
| Get one | `GET` | `/v1/tools/:id` |
| Create | `POST` | `/v1/tools` |
| Full update | `PUT` | `/v1/tools/:id` |
| Partial update | `PATCH` | `/v1/tools/:id` |
| Delete | `DELETE` | `/v1/tools/:id` |
| Sub-resource | `PUT` | `/v1/tools/:id/categories` |

### Query Parameters

- **camelCase** in API contract: `?page=1&limit=20&sort=createdAt&order=desc`
- Filter fields whitelisted: `?status=PUBLISHED&category=ai-writing`

### Path Parameters

- **camelCase** in NestJS: `:toolId`, `:categoryId`, `:slug`
- Public Web URLs use **slug** string: `/tools/chatgpt` not `/tools/uuid` when SEO-friendly

### DTOs

- Request: `CreateToolDto`, `UpdateToolDto`, `QueryToolsDto`
- Response: `ToolResponseDto`, `PaginatedToolsResponseDto`

### Response Objects

- Envelope fields: `data`, `meta`, `error`
- Entity fields match Prisma/API spec: `slug`, `publishedAt` (camelCase JSON)
- List responses never return bare arrays at root—always wrap in `data` with `meta` pagination
- Single resource responses may return object directly in `data` or bare entity per OpenAPI spec—pick one pattern per API version and never mix

### Sub-resource Naming

| Relationship | Path | Notes |
|---|---|---|
| Tool categories | `PUT /v1/tools/:toolId/categories` | Replace full category set |
| Tool tags | `PUT /v1/tools/:toolId/tags` | Replace full tag set |
| Tool reviews | `GET /v1/tools/:toolId/reviews` | Nested collection |
| Category tools | `GET /v1/categories/:categoryId/tools` | Inverse navigation |

Sub-resource paths use **plural** collection nouns. Action endpoints that are not CRUD use **POST** with verb phrase only when no REST mapping exists: `POST /v1/tools/:id/publish` (prefer state transition via `PATCH` with `status` when possible).

### Error Codes

- Machine-readable `error` string: `ValidationError`, `NotFoundError`, `UnauthorizedError`
- Optional `code` for client handling: `TOOL_SLUG_CONFLICT`, `INVALID_CREDENTIALS`
- Use SCREAMING_SNAKE for custom codes

---

## 10. Database Naming

### Tables

- **snake_case**, plural: `tools`, `categories`, `tool_categories`, `refresh_tokens`

### Columns

- **snake_case**: `id`, `slug`, `password_hash`, `published_at`, `created_at`, `updated_at`
- Foreign keys: `{entity}_id` — `tool_id`, `category_id`, `user_id`
- Booleans: `is_active`, `is_published` (or use status enum instead)

### Indexes

- Pattern: `{table}_{columns}_idx` or `{table}_{columns}_key` for unique
- Examples: `tools_slug_key`, `tools_status_published_at_idx`

### Foreign Keys

- Constraint name: `{table}_{column}_fkey`
- Example: `tool_categories_tool_id_fkey`

### Unique Constraints

- `{table}_{column}_key` for single column
- Descriptive for composite: `permissions_resource_action_key`

### Timestamps

- **Always** `created_at`, `updated_at` on mutable tables
- Event times: `published_at`, `expires_at`, `revoked_at`, `deleted_at` (if soft delete)

### Soft Delete

- Prefer `status` enum over `deleted_at` when possible
- If soft delete: `deleted_at` nullable timestamp; partial indexes exclude deleted rows

---

## 11. Environment Variables

### Naming Rules

| Rule | Detail |
|---|---|
| **SCREAMING_SNAKE_CASE** | All environment variables |
| **No secrets in names** | Name describes purpose, not value |
| **Grouped by prefix** | Service or domain prefix for clarity |
| **Public Next.js vars** | `NEXT_PUBLIC_` prefix only for browser-safe values |

### Prefixes

| Prefix | Usage | Examples |
|---|---|---|
| *(none)* | Server-side infrastructure | `DATABASE_URL`, `REDIS_URL` |
| `JWT_` | Authentication tokens | `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN` |
| `OPENAI_` | Provider-specific | `OPENAI_API_KEY`, `OPENAI_BASE_URL` |
| `STORAGE_` | Object storage | `STORAGE_ENDPOINT`, `STORAGE_BUCKET` |
| `NEXT_PUBLIC_` | Client-exposed (Web/Admin) | `NEXT_PUBLIC_API_URL` |
| `SITE_` / `APP_` | Application identity | `SITE_NAME`, `APP_URL` |
| `CRAWLER_` | Crawler configuration | `CRAWLER_USER_AGENT`, `CRAWLER_CONCURRENCY` |
| `ROBOTS_` | SEO crawler policy | `ROBOTS_NO_INDEX` |

### Standard Examples

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI API authentication |
| `NEXT_PUBLIC_API_URL` | API base URL for browser clients |
| `APP_URL` | Public Web canonical origin |
| `SITE_NAME` | Site name for metadata |
| `JWT_SECRET` | Access token signing secret |
| `MEILISEARCH_URL` | Search engine endpoint |
| `STORAGE_ACCESS_KEY` | S3-compatible access key |

Do not use ambiguous names: `KEY`, `URL`, `SECRET` without domain prefix.

### Environment Variable Examples by Domain

| Domain | Variables |
|---|---|
| **Application** | `NODE_ENV`, `APP_URL`, `ADMIN_URL`, `API_URL` |
| **Database** | `DATABASE_URL` |
| **Cache / Queue** | `REDIS_URL`, `QUEUE_URL` |
| **Search** | `MEILISEARCH_URL`, `MEILISEARCH_API_KEY` |
| **Auth** | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` |
| **Storage** | `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` |
| **AI Providers** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` |
| **SEO / Site** | `SITE_NAME`, `SITE_DESCRIPTION`, `SITE_URL`, `OG_IMAGE`, `TWITTER_HANDLE` |
| **Crawler** | `CRAWLER_USER_AGENT`, `CRAWLER_CONCURRENCY`, `CRAWLER_TIMEOUT_MS` |
| **Logging** | `LOG_LEVEL` |
| **Client (public)** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` |

Boolean environment variables use string `true` / `false` and descriptive names: `ROBOTS_NO_INDEX`, not `NO_INDEX`.

---

## 12. Git Naming

### Branch Names

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/{description}` | `feat/tool-compare-pages` |
| Bug fix | `fix/{description}` | `fix/sitemap-canonical-url` |
| Documentation | `docs/{description}` | `docs/naming-convention` |
| Cloud agent | `cursor/{description}-c760` | `cursor/implement-seo-foundation-c760` |
| Chore | `chore/{description}` | `chore/upgrade-prisma` |

- **kebab-case**, lowercase, no underscores

### Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add tool category assignment endpoint
fix(web): correct canonical URL for localized routes
docs(project): add naming convention document
chore(deps): bump next to 15.1.0
```

- Imperative mood, lowercase subject, no period at end
- Scope optional: `api`, `web`, `admin`, `seo`, `project`

### Tags

- Release tags: `v{major}.{minor}.{patch}` — `v2.0.0`, `v2.1.0-beta.1`
- No `release-` prefix on tags

### Release Versions

- Follow SemVer aligned with platform version in `docs/00-project/README.md`
- Pre-release: `v2.0.0-alpha.1`, `v2.0.0-rc.1`

---

## 13. SEO Naming

### Slug

- **kebab-case**, lowercase, URL-safe
- Derived from tool name, not internal ID
- Unique per entity type
- No trailing slashes in slug value

| Good | Bad |
|---|---|
| `chatgpt` | `ChatGPT` |
| `midjourney-v6` | `midjourney_v6` |
| `notion-ai` | `notion ai` |

### Canonical

- Full absolute URL: `https://example.com/tools/chatgpt`
- Localized: `https://example.com/zh-CN/tools/chatgpt`
- Config keys: `canonical`, `alternates.canonical`

### Meta Keys

- Next.js Metadata API standard keys: `title`, `description`, `openGraph`, `twitter`
- Custom site config: `SITE_NAME`, `SITE_DESCRIPTION`, `OG_IMAGE`

### Sitemap

- Filename: `sitemap.xml` (Next.js `app/sitemap.ts`)
- Index: `sitemap-index.xml` if split by locale or content type
- News sitemap: `news-sitemap.xml` (future)

### RSS

- Feed path: `/feed.xml`, `/news/feed.xml`
- Channel title includes site name: `AI Tool CMS — Latest Tools`

### JSON-LD IDs

- `@id` absolute URL matching canonical page
- Entity fragment optional: `https://example.com/tools/chatgpt#software`
- Types: `SoftwareApplication`, `BreadcrumbList`, `FAQPage`, `Organization`

### Route Paths (Web)

| Content | Path Pattern |
|---|---|
| Tool detail | `/tools/{slug}` |
| Category | `/categories/{slug}` |
| Tag | `/tags/{slug}` |
| Compare | `/compare/{slug-a}-vs-{slug-b}` |
| Collection | `/collections/{slug}` |
| Localized | `/{locale}/tools/{slug}` |

### Locale Identifiers

- BCP 47 tags lowercase with hyphen: `en`, `zh-CN`, `ja`, `ko`
- Never `cn`, `zh_cn`, or `CHINESE`
- URL segment matches locale code exactly: `/zh-CN/tools/chatgpt`
- `hreflang` values match locale identifiers

### Open Graph and Twitter Keys

| Key | Convention |
|---|---|
| `og:title` | Same as page title or shorter variant |
| `og:description` | ≤ 200 characters recommended |
| `og:image` | Absolute URL to `1200x630` image |
| `twitter:card` | `summary` or `summary_large_image` |
| `twitter:site` | `@handle` without URL |

---

## 14. AI Naming

### Prompt IDs

- **kebab-case** dot-separated hierarchy: `tool.description.generate`, `faq.extract`, `compare.summary`
- Stable IDs—do not rename without migration; prompts referenced in DB and jobs

### Prompt Files

```
.ai/prompts/tool-description.md
.ai/prompts/faq-generation.md
packages/ai/src/prompts/compare-summary.ts
```

- kebab-case filename matching prompt ID leaf

### Model Configs

- Environment: `OPENAI_DEFAULT_MODEL`, `AI_DEFAULT_MODEL`
- Config object keys: camelCase — `defaultModel`, `fallbackModel`, `maxTokens`

### AI Tasks

- BullMQ job names: kebab-case — `ai-generate-description`, `ai-classify-tags`
- Task files: `.ai/tasks/Commit-0010-seo-foundation.md`

### Generated Content

- Database fields: `description`, `summary`, `faqContent` — not `aiDescription` unless distinct from human-edited field
- If storing AI vs human separately: `generatedDescription`, `editedDescription`
- Status: `generationStatus`: `PENDING`, `COMPLETED`, `FAILED`, `APPROVED`

### Provider Identifiers

- Lowercase provider slug: `openai`, `anthropic`, `gemini`, `openrouter`, `deepseek`, `qwen`, `glm`
- Adapter classes: `OpenAiProvider`, `AnthropicProvider` (PascalCase)

### AI Pipeline Stage Naming

Background AI jobs follow `{domain}.{action}.{stage}` pattern:

| Stage | Job Name Example |
|---|---|
| Generate | `tool.description.generate` |
| Review | `tool.description.review` |
| Classify | `tool.tags.classify` |
| Translate | `tool.description.translate` |
| Index | `search.document.index` |

Worker processor classes: `ToolDescriptionGenerateProcessor` or file `tool-description-generate.processor.ts`.

### Token and Cost Fields

| Field | Purpose |
|---|---|
| `promptTokens` | Input tokens consumed |
| `completionTokens` | Output tokens generated |
| `totalTokens` | Sum for billing |
| `estimatedCostUsd` | Computed cost for analytics |
| `modelId` | Provider model string: `gpt-4o-mini`, `claude-3-5-sonnet` |

---

## 15. Reserved Words

The following names are **forbidden** for production modules, variables, tables, routes, and files. They communicate nothing and collide with test scaffolding.

### Forbidden Generic Names

| Reserved | Reason |
|---|---|
| `temp` | Implies disposable code that ships to production |
| `test` | Use `*.spec.ts` or `__tests__/`; not production module names |
| `demo` | Demo code belongs in examples, not core packages |
| `foo` | Placeholder |
| `bar` | Placeholder |
| `baz` | Placeholder |
| `data` | Too vague—name the entity |
| `info` | Too vague |
| `misc` | Dumping ground—use specific domain |
| `util` / `utils` (as sole module name) | Acceptable only as `packages/utils` with clear scope; not `misc-utils` |
| `helper` / `helpers` | Name what it helps: `slug-utils`, `date-formatter` |
| `manager` (without domain) | Use `CrawlerJobManager`, not `Manager` |
| `handler` (without domain) | Use `ToolPublishHandler` |
| `new` | Invalid / confusing |
| `default` | Reserved keyword collision |
| `undefined` | Meaningless identifier |

### Forbidden Route and Table Names

| Reserved | Use Instead |
|---|---|
| `/api` as entity path | `/v1/tools` under API app |
| `items`, `records`, `objects` | Domain noun: `tools`, `categories` |
| `users` for public profiles | `users` only for auth accounts; public identity separate if needed |

### Test-Only Prefixes

- `mock*`, `fake*`, `stub*` — test files only
- `TEST_*` — environment variables in test env only

---

## 16. Naming Checklist

Before creating a new module, file, table, endpoint, or package, confirm:

### Concept

- [ ] Name matches `spec/` domain term (Tool, Category, Tag—not synonyms)
- [ ] One canonical name chosen for all layers
- [ ] Name is self-explanatory without abbreviation

### Files and Folders

- [ ] Folder is lowercase kebab-case
- [ ] File follows type convention (`.service.ts`, `.dto.ts`, `page.tsx`)
- [ ] Feature-first path under correct app or package
- [ ] No reserved words used

### TypeScript

- [ ] Variables and functions camelCase; classes/interfaces PascalCase
- [ ] Constants SCREAMING_SNAKE_CASE
- [ ] No TypeScript `enum` or `namespace`
- [ ] Boolean prefixes (`is`, `has`, `can`) where applicable

### API and Database

- [ ] REST path plural, kebab-case, versioned
- [ ] Table snake_case plural; columns snake_case
- [ ] Prisma model PascalCase singular with `@@map`
- [ ] Foreign keys named `{entity}_id`
- [ ] `created_at` and `updated_at` on mutable tables

### Operations

- [ ] Environment variable has domain prefix and SCREAMING_SNAKE_CASE
- [ ] Git branch kebab-case with conventional prefix
- [ ] SEO slug kebab-case, unique, lowercase
- [ ] AI prompt ID hierarchical and stable

### Documentation

- [ ] Public export added to package `index.ts`
- [ ] README or doc cross-reference updated if new package or major module

---

## 17. Good vs Bad Examples

Comprehensive comparison across all layers. **Good** names are production-ready; **Bad** names violate this document.

### General and TypeScript

| # | Context | Bad | Good |
|---|---|---|---|
| 1 | Variable | `d` | `publishedAt` |
| 2 | Variable | `tempList` | `draftTools` |
| 3 | Function | `handle()` | `publishTool()` |
| 4 | Function | `getData()` | `fetchToolsByCategory()` |
| 5 | Constant | `max` | `MAX_PAGE_SIZE` |
| 6 | Interface | `ITool` | `ToolResponse` |
| 7 | Type alias | `tool_type` | `ToolStatus` |
| 8 | Generic | `Thing` | `TTool` |
| 9 | Boolean | `published` | `isPublished` |
| 10 | Boolean | `permission` | `hasEditPermission` |
| 11 | File | `utils.ts` (5000 lines) | `slug-utils.ts` |
| 12 | File | `misc.ts` | `format-currency.ts` |

### React and Frontend

| # | Context | Bad | Good |
|---|---|---|---|
| 13 | Component | `Card` | `ToolCard` |
| 14 | Component | `tool_card` | `ToolCard` |
| 15 | Hook | `toolSearch` | `useToolSearch` |
| 16 | Hook | `useData` | `usePaginatedTools` |
| 17 | Props type | `Props` | `ToolCardProps` |
| 18 | Page route | `app/ToolDetail/` | `app/tools/[slug]/` |
| 19 | Context | `Context` | `AuthContext` |
| 20 | Provider | `Provider` | `QueryProvider` |

### NestJS and API

| # | Context | Bad | Good |
|---|---|---|---|
| 21 | Controller | `ToolCtrl` | `ToolsController` |
| 22 | Service | `ToolManager` | `ToolsService` |
| 23 | Module | `tool` | `ToolsModule` |
| 24 | DTO | `ToolDTO` | `CreateToolDto` |
| 25 | Endpoint | `GET /getToolById` | `GET /v1/tools/:id` |
| 26 | Endpoint | `POST /tool/create` | `POST /v1/tools` |
| 27 | Query param | `?p=1` (undocumented) | `?page=1&limit=20` |
| 28 | Error code | `error1` | `TOOL_SLUG_CONFLICT` |
| 29 | Guard | `Auth` | `JwtAuthGuard` |
| 30 | Job name | `job1` | `ai-generate-description` |

### Database and Prisma

| # | Context | Bad | Good |
|---|---|---|---|
| 31 | Table | `Tool` | `tools` |
| 32 | Table | `tool` (singular) | `tools` |
| 33 | Column | `publishDate` | `published_at` |
| 34 | Column | `user` | `user_id` |
| 35 | Model | `tools` | `Tool` with `@@map("tools")` |
| 36 | Junction | `toolCategory` table | `tool_categories` / `ToolCategory` |
| 37 | Migration | `migration1` | `20260115_add_tool_tags` |
| 38 | Index | `idx1` | `tools_slug_key` |

### Infrastructure, Git, SEO, AI

| # | Context | Bad | Good |
|---|---|---|---|
| 39 | Docker image | `api:latest` | `ai-tool-cms-api:2.0.0` |
| 40 | Container | `postgres` | `ai-tool-cms-postgres` |
| 41 | Env var | `KEY` | `OPENAI_API_KEY` |
| 42 | Env var | `apiUrl` | `NEXT_PUBLIC_API_URL` |
| 43 | Branch | `fix` | `fix/sitemap-canonical-url` |
| 44 | Commit | `fixed stuff` | `fix(seo): correct canonical URL` |
| 45 | Tag | `release-2.0` | `v2.0.0` |
| 46 | SEO slug | `ChatGPT` | `chatgpt` |
| 47 | SEO slug | `tool_123` | `notion-ai` |
| 48 | JSON-LD @id | `/tools/1` | `https://example.com/tools/chatgpt` |
| 49 | Prompt ID | `prompt1` | `tool.description.generate` |
| 50 | AI field | `aiText` | `generatedDescription` |

### Package and Repository

| # | Context | Bad | Good |
|---|---|---|---|
| 51 | Package dir | `packages/SEO/` | `packages/seo/` |
| 52 | Package name | `seo-utils` | `@ai-tool-cms/seo` |
| 53 | App dir | `apps/WebApp/` | `apps/web/` |
| 54 | Spec file | `Tools.md` | `spec/tool.md` |
| 55 | Doc dir | `docs/seo/` | `docs/09-seo/` |

---

## Quick Reference Card

```mermaid
flowchart TB
    subgraph Code
        VAR[camelCase variables]
        CLS[PascalCase classes]
        CONST[SCREAMING_SNAKE constants]
    end

    subgraph Files
        DIR[kebab-case folders]
        SVC[tools.service.ts]
        DTO[create-tool.dto.ts]
    end

    subgraph Data
        TBL[snake_case tables]
        MDL[PascalCase Prisma models]
        API_PATH[/v1/tools kebab-case]
    end

    subgraph Ops
        ENV[SCREAMING_SNAKE env]
        BR[feat/kebab-branch]
        TAG[v2.0.0 tag]
    end
```

---

## Related Documents

- [Coding Standards](./CodingStandards.md) — Full engineering standards including naming section
- [Folder Structure](./FolderStructure.md) — Repository layout and dependency rules
- [Technology Stack](./TechStack.md) — Technology decisions
- [Project Overview](./README.md) — Documentation entry point

---

**Document Version**

| Field | Value |
|---|---|
| Version | 2.0.0 |
| Status | Draft |
| Owner | Project Architecture Team |
| Last Updated | 2026 |
