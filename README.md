# AI Tool CMS

AI 工具内容管理系统 Monorepo。

## 项目结构

```
ai-tool-cms/
├── apps/                 # 应用层
│   ├── web/              # 面向用户的 Web 站点
│   ├── admin/            # 管理后台
│   ├── api/              # 后端 API 服务
│   ├── crawler/          # 数据采集服务
│   ├── worker/           # 异步任务 Worker
│   └── scheduler/        # 定时调度服务
├── packages/             # 共享包
│   ├── ui/               # UI 组件库
│   ├── config/           # 共享配置
│   ├── database/         # 数据库访问层
│   ├── types/            # 共享类型定义
│   ├── utils/            # 工具函数
│   ├── seo/              # SEO 相关
│   ├── ai/               # AI 能力封装
│   ├── crawler-core/     # 爬虫核心
│   ├── logger/           # 日志
│   ├── auth/             # 认证授权
│   ├── storage/          # 对象存储
│   ├── queue/            # 消息队列
│   └── common/           # 通用模块
├── docs/                 # 项目文档
├── spec/                 # 业务规格与内容规范
├── docker/               # Docker 相关
├── scripts/              # 脚本
└── prisma/               # 数据库 Schema 与迁移
```

## 快速开始

### 1. 环境变量

```bash
cp .env.example .env
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动应用

各应用可独立运行：

| 应用 | 技术栈 | 端口 | 命令 |
|------|--------|------|------|
| `web` | Next.js 15 + React 19 + Tailwind | 3000 | `pnpm dev:web` |
| `admin` | Next.js 15 + Tailwind | 3001 | `pnpm dev:admin` |
| `api` | NestJS + Swagger | 4000 | `pnpm dev:api` |

同时启动全部应用：

```bash
pnpm dev
```

构建与类型检查：

```bash
pnpm build
pnpm typecheck
```

API 文档：`http://localhost:4000/docs`  
健康检查：`http://localhost:4000/health`

### 5. 认证（Admin API）

管理员默认账号（由 `pnpm db:seed` 创建）：

- 邮箱：`admin@example.com`
- 密码：`Admin@123`

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth/login` | POST | 管理员登录，返回 JWT 与 Refresh Token |
| `/auth/me` | GET | 获取当前用户（含角色与权限，需 Bearer Token） |
| `/auth/logout` | POST | 退出登录并吊销 Refresh Token |

```bash
# 登录
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

### 4. 数据库（Prisma）

确保 PostgreSQL 已启动（见 `docker-compose.yml`），然后执行迁移与种子数据：

```bash
pnpm db:migrate    # 开发环境迁移
pnpm db:seed       # 填充初始角色与权限
```

常用命令：

| 命令 | 说明 |
|------|------|
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 创建并应用开发迁移 |
| `pnpm db:migrate:deploy` | 生产环境应用迁移 |
| `pnpm db:seed` | 执行种子脚本 |
| `pnpm db:studio` | 打开 Prisma Studio |

初始模型：`User`、`Role`、`Permission`（RBAC）、`Tool`（AI 工具实体，含 `slug` / `website` 唯一索引）。

Prisma Client 由 `@ai-tool-cms/database` 包导出，供各应用引用。

## 文档

详细设计文档见 `docs/` 目录：

| 目录 | 说明 |
|------|------|
| `00-project` | 项目概述 |
| `01-architecture` | 架构设计 |
| `02-database` | 数据库设计 |
| `03-api` | API 规范 |
| `04-web` ~ `08-ai` | 各应用模块说明 |
| `09-seo` ~ `13-roadmap` | SEO、运维、测试与路线图 |

## 许可证

见 [LICENSE](./LICENSE) 文件。
