# Product Sprint 2 - Batch 4B Report

## Current Status

Batch 4B 的第一阶段已经完成：首批 50 个高质量 AI tools 的结构化数据文件已经创建，同时新增了独立的本地校验脚本，用于在接入 seed 之前先验证数据质量和导入规则。

这一步还没有接入默认 `prisma/seed.ts`，目的是把风险拆开，先确保数据本身和校验逻辑稳定，再单独完成 seed 接入。

## Files Created

- `docs/import/first-50-ai-tools.json`
- `prisma/seeds/validate-curated-tools.ts`
- `docs/product/ProductSprint2_Batch4B_Report.md`

## Dataset Scope

本批次数据集包含 50 个真实 AI tools，覆盖以下重点产品和能力方向：

- ChatGPT
- Claude
- Gemini
- Perplexity
- Midjourney
- Runway
- ElevenLabs
- Cursor
- GitHub Copilot
- Notion AI
- Canva AI
- Leonardo AI
- Lovable
- Bolt.new
- v0
- Replit AI
- Zapier AI
- n8n
- Make
- HeyGen
- Suno
- Udio
- Jasper
- Copy.ai
- Grammarly
- Writesonic
- Surfer
- Frase
- Descript
- Synthesia
- Pictory
- VEED
- CapCut
- Murf
- Speechify
- Otter
- Fireflies
- Gamma
- Tome
- Beautiful.ai
- Figma AI
- Adobe Firefly
- Luma AI
- Photoroom
- Opus Clip
- NotebookLM
- Harvey
- Glean
- Airtable AI
- Intercom Fin

## Import Format

`first-50-ai-tools.json` 采用 Batch 4A 定义的 canonical import structure，包含：

- `name`
- `slug`
- `website`
- `summary`
- `description`
- `primary_category`
- `secondary_categories`
- `tags`
- `pricing`
- `features`
- `use_cases`
- `target_users`
- `languages`
- `platform`
- `seo_title`
- `seo_description`

## Mapping Quality

每个工具都已映射到：

- 1 个 primary category
- 0 到多个 secondary categories
- 多个非分类标签
- 高层级 pricing type
- 多个 use cases
- 多个人群标签

主分类统一限制在 professional taxonomy 的一级分类中：

- Writing
- Image
- Video
- Audio
- Code
- Productivity
- Marketing
- SEO
- Research
- Education
- Automation
- Business
- Design
- Data
- Sales
- Customer Support

## Validation Strategy

新增脚本：

- `prisma/seeds/validate-curated-tools.ts`

校验规则包括：

- exact tool count equals 50
- duplicate slug detection
- duplicate website detection
- required field presence
- slug format validation
- website URL validation
- primary category validation
- secondary category validation
- category duplicated in tags
- duplicate tags
- pricing enum validation
- SEO title length
- SEO description length
- summary length
- description length

## Content Quality Notes

这批数据遵守以下约束：

- 没有抓取网站内容
- 没有复制官网营销段落
- summary 与 description 均为原创整理
- 只保留高层级 pricing type
- 不编造具体价格数值
- 不编造评论和评分

## How To Validate

本地可以通过以下方式执行数据校验：

```bash
tsx prisma/seeds/validate-curated-tools.ts
```

如果需要通过项目脚本运行，下一步可以在 seed 接入时一并补一个 package script。

## Remaining Work

当前还剩一个关键步骤：

1. 将这 50 条 curated dataset 接入现有 `prisma/seed.ts`
2. 将 JSON 数据映射为 `Tool`、`Category`、`Tag`、`PricingPlan`、`Faq` 写入逻辑
3. 在本地运行 seed 验证真实导入结果

## Acceptance Progress

当前已完成：

- 50 tools dataset exists
- every tool has a slug
- every tool has a website
- every tool has a summary
- every tool has a description
- every tool has one primary category in the dataset
- validation script exists

当前未完成：

- seed integration
- actual database import execution
- import success verification against a running database
