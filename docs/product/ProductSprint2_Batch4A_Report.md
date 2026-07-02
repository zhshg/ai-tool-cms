# Product Sprint 2 - Batch 4A Report

## Summary

Batch 4A 的目标是为后续大规模 AI tool 内容建设建立统一导入框架，而不是立即导入内容。本批次已完成导入规范、CSV 模板和 JSON schema 的文档化定义，为后续 CSV import、JSON import、Admin import 和 Crawler import 提供统一标准。

本批次没有修改数据库 schema，没有修改 API contract，没有修改 seed，也没有导入任何生产数据。

## Files Created

- `docs/import/ToolImportSpecification.md`
- `docs/import/tool-import-template.csv`
- `docs/import/tool-import-schema.json`
- `docs/product/ProductSprint2_Batch4A_Report.md`

## Import Format

本批次建立了一个 canonical import record 结构，核心特点如下：

- 统一 required fields 和 optional fields
- 统一 slug 规则
- 统一 category mapping 规则
- 统一 tag 使用规则
- 统一 pricing、FAQ、SEO、logo、screenshot 校验边界
- 所有导入入口复用同一套 validation 思路

### Required fields

- `name`
- `slug`
- `website`
- `summary`
- `description`
- `primary_category`
- `pricing`
- `seo_title`
- `seo_description`

### Optional fields

- `logo`
- `secondary_categories`
- `tags`
- `features`
- `use_cases`
- `languages`
- `platform`
- `target_users`
- `screenshots`
- `faq`
- `pricing_plans`
- `alternatives`
- `source_urls`
- `last_verified_at`
- `notes`

## Validation Strategy

本批次定义了未来导入器必须执行的校验策略。

### Blocking rules

以下问题应阻断导入：

- duplicate slug detection
- duplicate website detection
- missing required fields
- invalid website URLs
- invalid categories
- invalid pricing values

### Warning rules

以下问题应在 preview 阶段提示人工确认：

- SEO title 过长或过短
- SEO description 过长或过短
- summary 过短
- 缺少 logo
- 缺少 screenshots

### Editorial quality rules

本批次也固定了内容质量边界：

- 不允许复制版权长文
- 不允许编造价格
- 不允许虚构评分或评论
- 不允许 AI 生成内容绕过人工审核
- 所有工具记录应保留来源 URL 以便核验

## Category Mapping Strategy

本批次把分类映射文档化为可复用规则，重点包括：

- 每个工具必须有且只有一个 `primary_category`
- 可有多个 `secondary_categories`
- `tags` 不得重复 category 概念
- subcategory 必须映射到 Batch 3 professional taxonomy

文档中已给出以下映射示例：

- Writing -> Blog Writing -> Copywriting -> Email
- Image -> Image Generation -> Editing -> Avatar
- Video -> Video Generation -> Video Editing
- Audio -> Transcription -> Voice Generation
- Code -> Code Assistant -> Code Review -> API

## Import Workflow

本批次明确了未来生产导入流程：

1. CSV / JSON / Admin / Crawler source
2. Validation
3. Preview
4. Admin approval
5. Import
6. SEO generation or verification
7. Search indexing

这样做的价值是：

- 先拦截格式和分类问题
- 再让运营或编辑做人工确认
- 最后才进入正式写入和索引流程

## Editorial Workflow

本批次同时固定了内容编辑流转：

1. `Draft`
2. `Review`
3. `Approved`
4. `Published`
5. `Crawler updates`

其中关键约束是：

- `Crawler updates` 只能提出变更建议
- 不能自动覆盖人工审核后的已发布内容

## Future Implementation Plan

Batch 4A 完成后，推荐实现顺序如下：

1. 先实现 JSON validator
2. 再实现 CSV parser 到 canonical JSON record 的转换
3. 再实现 preview report
4. 再实现 admin approval workflow
5. 最后接入 search indexing 和 crawler enrichment

### Recommended next batch focus

最合理的下一步是进入 Batch 4B 的准备阶段：

- 用本批次模板定义 50 个高质量真实工具样本
- 验证分类映射是否稳定
- 验证详情页字段是否足够支撑内容展示
- 验证 SEO 字段和 internal linking 的内容质量

## Acceptance Check

本批次已满足以下条件：

- Framework is documented
- Templates exist
- No database schema changed
- No API contract changed
- No production data imported
- No seed modified

## Implementation Boundaries

本批次刻意未做以下事情：

- 未实现导入服务
- 未实现 CSV parser
- 未实现 JSON validator 代码
- 未实现 admin approval UI
- 未实现 crawler ingestion
- 未导入任何真实工具数据

结论：Batch 4A 已完成“导入框架定义”这一目标，平台已经具备进入后续导入实现阶段所需的规范基础。
