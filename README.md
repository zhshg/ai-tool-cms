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
│   ├── postgres/         # PostgreSQL 初始化脚本
│   ├── redis/            # Redis 配置
│   └── meilisearch/      # Meilisearch 配置
├── scripts/              # 脚本
└── prisma/               # 数据库 Schema 与迁移
```

## 快速开始

### 1. 环境变量

```bash
cp .env.example .env
```

按需修改 `.env` 中的数据库、Redis、Meilisearch 等连接信息。

### 2. 启动本地基础设施（Docker Compose）

```bash
docker compose up -d
```

服务默认端口：

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| PostgreSQL | `postgres:16` | 5432 | 主数据库 |
| Redis | `redis:7` | 6379 | 缓存与消息队列 |
| Meilisearch | `getmeili/meilisearch:latest` | 7700 | 全文搜索引擎 |

常用命令：

```bash
# 查看服务状态与健康检查
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务（保留数据卷）
docker compose down

# 停止并清除数据卷
docker compose down -v
```

容器间通过 `ai-tool-cms-network` 桥接网络通信；宿主机应用使用 `localhost` 与上述端口连接。

### 3. 应用开发（待各包就绪后补充）

1. 安装依赖（待配置）
2. 初始化数据库（待配置）
3. 启动开发服务（待配置）

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
