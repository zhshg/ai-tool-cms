# AI Tool CMS v2

> Enterprise-grade AI Tool Directory & Online Tools Platform
>
> Version: 2.0.0
>
> Status: Planning
>
> License: MIT

---

# 1. Project Overview

AI Tool CMS 是一个面向 AI 工具导航、AI 在线工具、AI 内容自动化运营的企业级 CMS。

本项目并不是 Toolify 的复制品，而是一个完整的平台。

目标包括：

- AI Tool Directory
- AI Online Tools
- AI Prompt Library
- AI Workflow Library
- AI Agent Directory
- AI API Directory
- AI News
- AI Tutorials
- AI Compare Pages
- AI Alternatives Pages
- AI Reviews
- AI Collections

同时提供后台 CMS、自动采集、AI 自动生成内容、SEO、GEO、统计分析等能力。

最终目标是成为一个能够长期运营、持续自动增长内容的网站系统，而不是静态导航站。

---

# 2. Project Goals

本项目的核心目标包括：

## 2.1 自动更新

系统能够自动：

- 采集 AI 工具
- 更新工具信息
- 更新 Logo
- 更新截图
- 更新 Pricing
- 更新 Features
- 更新 API 信息
- 更新 Changelog
- 更新 Release

无需人工维护。

---

## 2.2 自动 SEO

系统自动生成：

- Meta Title
- Meta Description
- OpenGraph
- Twitter Card
- Canonical
- Sitemap
- Robots
- JSON-LD
- FAQ Schema
- Breadcrumb Schema
- SoftwareApplication Schema

支持百万级页面。

---

## 2.3 自动 GEO

针对 AI Search Engine（ChatGPT、Gemini、Claude、Perplexity 等）优化内容结构。

包括：

- Structured Content
- Entity Linking
- Citation Ready
- FAQ Ready
- Comparison Ready
- Rich Snippets

提高 AI 搜索引用概率。

---

## 2.4 自动内容生成

集成大模型自动生成：

- Tool Description
- Summary
- FAQ
- Reviews
- Tutorials
- Compare
- Alternatives
- News
- Release Notes

支持多语言。

---

## 2.5 在线工具

支持部署：

- AI Text Tools
- Image Tools
- PDF Tools
- SEO Tools
- Developer Tools
- Marketing Tools
- Utility Tools

所有在线工具统一由 CMS 管理。

---

# 3. Target Users

主要用户：

## 普通访客

浏览 AI 工具

搜索工具

阅读教程

收藏工具

分享工具

---

## 内容运营

发布工具

审核工具

编辑文章

管理分类

管理 Prompt

管理 Collection

---

## SEO 团队

关键词管理

页面优化

自动生成 Landing Page

管理 Sitemap

管理 Robots

查看索引状态

---

## 开发者

维护系统

开发插件

扩展 API

开发在线工具

---

# 4. Core Modules

整个系统划分为以下模块：

## CMS

后台管理。

负责：

- Tool
- Category
- Tag
- FAQ
- Prompt
- Review
- Collection
- Pricing
- Release
- News

---

## Web

面向访客的网站。

包括：

首页

工具页

详情页

分类页

标签页

Compare

Alternatives

Reviews

Collections

News

Blog

Tutorial

Search

---

## API

REST API

GraphQL（可选）

OpenAPI

Webhook

Authentication

---

## Worker

后台任务。

包括：

AI 生成

SEO 更新

截图

Logo 下载

RSS

邮件

定时任务

---

## Scheduler

Cron Job

自动同步

自动采集

自动生成内容

自动更新 Sitemap

自动 Ping Search Engine

---

## Crawler

采集：

GitHub

Product Hunt

Hugging Face

OpenRouter

Anthropic

OpenAI

官方 RSS

官网

---

## AI

统一 AI 服务层。

支持：

OpenAI

Claude

Gemini

DeepSeek

Qwen

GLM

OpenRouter

支持 Prompt 模板。

---

## Search

全文搜索。

支持：

Meilisearch

PostgreSQL Full Text

Hybrid Search

---

## Analytics

统计：

PV

UV

Search

Popular Tools

Clicks

Traffic Sources

SEO

---

# 5. Non-Goals

当前版本不包括：

- 社交网络
- 即时聊天
- 视频平台
- AI 模型训练
- 大规模社区论坛
- 企业 OA

未来可扩展。

---

# 6. Design Principles

整个项目遵循：

## Simple

模块职责单一。

---

## Scalable

支持百万级工具。

---

## Modular

所有模块可独立部署。

---

## API First

所有能力优先提供 API。

---

## AI Native

AI 不作为插件，而是核心能力。

---

## SEO First

任何页面必须支持 SEO。

---

## GEO First

任何内容必须适配 AI Search。

---

## Open Source Friendly

所有模块可独立开源。

---

# 7. Technology Stack

前端：

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

后台：

- NestJS
- Prisma
- PostgreSQL

缓存：

- Redis

搜索：

- Meilisearch

消息队列：

- BullMQ

对象存储：

- S3 Compatible

AI：

- OpenAI
- Claude
- Gemini
- OpenRouter

部署：

- Docker
- Docker Compose

未来支持：

- Kubernetes

---

# 8. Repository Structure

```
apps/
packages/
docs/
spec/
scripts/
docker/
prisma/
.cursor/
.ai/
```

详细说明见：

- FolderStructure.md

---

# 9. Development Workflow

开发遵循：

1. Specification First
2. Documentation First
3. Architecture First
4. Code Second
5. Testing
6. Review
7. Release

任何功能开发之前，必须先完成文档。

---

# 10. Milestones

Phase 1

基础架构

---

Phase 2

CMS

---

Phase 3

Crawler

---

Phase 4

AI

---

Phase 5

SEO

---

Phase 6

Online Tools

---

Phase 7

Enterprise Features

---

# 11. Documentation Index

00-project

项目说明

---

01-architecture

系统架构

---

02-database

数据库设计

---

03-api

接口规范

---

04-web

前端规范

---

05-admin

后台规范

---

06-crawler

采集系统

---

07-worker

任务系统

---

08-ai

AI 服务

---

09-seo

SEO 系统

---

10-geo

GEO 系统

---

11-devops

部署与运维

---

12-testing

测试规范

---

13-roadmap

项目路线图

---

# 12. Vision

打造一个能够：

- 自动发现 AI 工具
- 自动更新内容
- 自动完成 SEO
- 自动完成 GEO
- 自动生成高质量页面
- 自动扩展在线工具

最终形成一个持续增长、低人工维护成本的 AI 平台。

---

**Document Version**

Version：2.0.0

Status：Draft

Owner：Project Architecture Team

Last Updated：2026
