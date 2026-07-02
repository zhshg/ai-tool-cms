# Tool Import Specification

## Purpose

本规范定义 AI Tool CMS 的统一工具导入格式，用于支撑后续四类导入入口：

- CSV import
- JSON import
- Admin import
- Crawler import

本规范只定义内容结构、字段规则、校验标准、分类映射和编辑流程，不包含数据库 schema 变更，不包含 API 契约变更，也不执行任何生产数据导入。

## Scope

本规范适用于以下实体的数据准备与校验：

- `Tool`
- `Category`
- `Tag`
- `Pricing`
- `FAQ`

本规范默认复用当前已有模型能力：

- `Tool`
- `Category`
- `Tag`
- `ToolCategory`
- `ToolTag`
- `PricingPlan`
- `Faq`

## Import Modes

所有导入模式必须遵守同一套字段和校验标准。

### CSV import

适合批量录入、运营整理和 Excel 协作。

### JSON import

适合结构化导入、脚本处理、批量预校验和未来导入服务实现。

### Admin import

适合人工单条录入、编辑修正、审核发布。

### Crawler import

仅允许用于补充基础公开事实，例如：

- 官网 URL
- canonical URL
- logo URL
- title
- description 线索

Crawler 结果不能绕过人工审核直接发布。

## Canonical Import Record

每一条导入记录表示一个 AI tool 的 canonical import record。

每个 record 应满足：

- 对应一个唯一工具
- 包含唯一 `slug`
- 包含唯一 canonical `website`
- 必须能够映射到一个主分类
- 必须保留来源信息，便于审核与更新

## Required Fields

以下字段为导入最小必填字段：

- `name`
- `slug`
- `website`
- `summary`
- `description`
- `primary_category`
- `pricing`
- `seo_title`
- `seo_description`

### Required field definitions

#### `name`

- 类型：`string`
- 最小长度：`2`
- 最大长度：`120`
- 必须为工具官方名称或最常见产品名称

#### `slug`

- 类型：`string`
- 最小长度：`2`
- 最大长度：`80`
- 必须全局唯一
- 仅允许小写字母、数字和连字符

#### `website`

- 类型：`string`
- 必须为绝对 URL
- 必须为工具官网或官方产品主页

#### `summary`

- 类型：`string`
- 建议长度：`80` 到 `180` 字符
- 用于目录卡片、列表页摘要和页面引导

#### `description`

- 类型：`string`
- 建议长度：`300` 到 `2000` 字符
- 必须为原创整理内容

#### `primary_category`

- 类型：`string`
- 必须匹配有效 taxonomy category
- 一个工具必须且只能有一个 `primary_category`

#### `pricing`

- 类型：`string`
- 必须匹配允许的 pricing 枚举

#### `seo_title`

- 类型：`string`
- 建议长度：`40` 到 `65` 字符

#### `seo_description`

- 类型：`string`
- 建议长度：`120` 到 `160` 字符

## Optional Fields

以下字段为推荐可选字段：

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

### Optional field definitions

#### `logo`

- 类型：`string`
- 必须为绝对 URL
- 优先使用官方 logo 或可合法引用的品牌图

#### `secondary_categories`

- 类型：`array<string>` 或分隔字符串
- 可选多个
- 不得包含 `primary_category`

#### `tags`

- 类型：`array<string>` 或分隔字符串
- 用于表达非层级属性

#### `features`

- 类型：`array<string>` 或分隔字符串
- 建议数量：`3` 到 `8`

#### `use_cases`

- 类型：`array<string>` 或分隔字符串
- 建议数量：`2` 到 `6`

#### `languages`

- 类型：`array<string>` 或分隔字符串
- 表达产品支持语言，不是内容语言偏好

#### `platform`

- 类型：`array<string>` 或分隔字符串
- 例如：`Web`、`API`、`Chrome Extension`、`iOS`、`Android`、`Desktop`

#### `target_users`

- 类型：`array<string>` 或分隔字符串
- 例如：`Marketers`、`Developers`、`Students`

#### `screenshots`

- 类型：`array<string>`
- 必须为绝对 URL

#### `faq`

- 类型：`array<object>`
- 每一项应包含 `question` 和 `answer`

#### `pricing_plans`

- 类型：`array<object>`
- 每一项可包含 `name`、`price_label`、`billing_period`、`description`

#### `alternatives`

- 类型：`array<string>`
- 存储候选工具 slug 或名称，后续导入时需要映射解析

#### `source_urls`

- 类型：`array<string>`
- 用于内部审核和追溯

#### `last_verified_at`

- 类型：`string`
- ISO 8601 日期或日期时间

#### `notes`

- 类型：`string`
- 仅用于编辑或审核备注，不用于前台展示

## Validation Rules

所有导入记录在进入 preview 阶段前必须通过以下校验。

### Required field validation

- 缺少任何必填字段，记录直接标记为 `invalid`
- `summary` 为空或仅占位文本，标记为 `invalid`
- `description` 为空或明显低质量，标记为 `invalid`

### Duplicate slug detection

- 同一批导入中 `slug` 不得重复
- 与现有数据库中已存在的 `slug` 不得重复
- 若重复，必须在 preview 阶段阻断导入

### Duplicate website detection

- 规范化 `website` 后不得重复
- 规范化规则至少包含：
  - 去除末尾 `/`
  - 域名转小写
  - 删除已知跟踪参数
  - 优先 canonical URL

### Invalid URL detection

以下 URL 应判定为无效：

- 非 `http` 或 `https`
- 相对路径
- 缺少 host
- 明显测试地址，例如 `localhost`
- 明显占位地址，例如 `example.com`

### Missing required fields

- 任一必填字段为空值、空数组、空白字符串，视为缺失

### Invalid categories

- `primary_category` 不在允许 taxonomy 列表中，标记为 `invalid`
- `secondary_categories` 中出现未知分类，标记为 `invalid`
- `secondary_categories` 中重复项需自动去重

### Invalid tags

- tag 为空白或重复，需去重或拦截
- tag 不得与 category 同名
- tag 不得仅为大小写差异重复

### SEO length limits

- `seo_title` 超过 `70` 字符，标记为 `warning`
- `seo_title` 少于 `20` 字符，标记为 `warning`
- `seo_description` 超过 `180` 字符，标记为 `warning`
- `seo_description` 少于 `80` 字符，标记为 `warning`

### Content quality validation

- 发现明显复制粘贴的版权长文，标记为 `blocked`
- 发现虚构价格、虚构评分、虚构评论，标记为 `blocked`
- 发现 summary 或 description 为机械占位文案，标记为 `warning` 或 `invalid`

## Slug Rules

`slug` 是工具 URL 和导入去重的核心标识。

规则如下：

- 只能使用小写字母、数字和 `-`
- 不能包含空格
- 不能包含 `_`
- 不能以 `-` 开头或结尾
- 不能连续出现多个 `-`
- 应尽量基于品牌名或最稳定产品名
- 不应在 slug 中加入年份、营销词或分类词，除非为解决冲突必需

### Slug normalization examples

- `ChatGPT` -> `chatgpt`
- `Notion AI` -> `notion-ai`
- `Runway ML` -> `runway-ml`

### Slug conflict resolution

当品牌名冲突时，按以下顺序处理：

1. 优先使用官方产品名
2. 若仍冲突，增加稳定品牌限定词
3. 不使用随机数字后缀，除非没有更清晰方案

## Category Mapping Rules

分类必须遵循 Batch 3 professional taxonomy。

### Primary category rule

- 每个工具必须有且只有一个 `primary_category`
- `primary_category` 决定 canonical category landing page 和核心 breadcrumb

### Secondary category rule

- 每个工具可以有零到多个 `secondary_categories`
- `secondary_categories` 用于交叉发现、推荐和筛选

### Category mapping examples

#### Writing

- Writing
- Blog Writing
- Copywriting
- Email
- Social Media Writing
- Documentation

#### Image

- Image
- Image Generation
- Image Editing
- Avatar
- Logo Design
- Portrait

#### Video

- Video
- Video Generation
- Video Editing
- Avatar Video
- Screen Recording

#### Audio

- Audio
- Transcription
- Voice Generation
- Voice Cloning
- Podcast Editing

#### Code

- Code
- Code Assistant
- Code Review
- DevOps
- API

### Category mapping constraints

- `primary_category` 不能同时出现在 `secondary_categories`
- 不允许把 category 当作 tag 再重复录入
- 未识别 subcategory 不应直接自由写入，必须先映射到标准 taxonomy

## Tag Rules

Tag 只用于表达非层级属性。

### Tag usage examples

- 功能：`Summarization`、`Transcription`、`Automation`
- 平台：`Web`、`API`、`Mobile`
- 人群：`Students`、`Marketers`、`Developers`
- 使用方式：`No-code`、`Enterprise`

### Tag rules

- 单个 tag 长度建议 `2` 到 `40`
- 区分展示大小写，但比较时按不区分大小写去重
- 不允许与 category 名称重复
- 不允许使用无意义 tag，例如 `Tool`、`AI Tool`
- 不建议单条工具超过 `12` 个 tags

## Pricing Rules

导入阶段只允许使用标准化 pricing 枚举，避免编造价格。

### Allowed pricing values

- `Free`
- `Freemium`
- `Paid`
- `Custom`
- `Trial`
- `Open Source`

### Pricing rules

- `pricing` 必须从允许值中选择
- 无法验证具体价格时，只写高层级 pricing type
- `pricing_plans` 仅在有公开来源时填写
- 不得推测月费、年费或企业报价

## FAQ Rules

FAQ 用于增强详情页和 SEO，但必须可验证。

### FAQ structure

每条 FAQ 应包含：

- `question`
- `answer`

### FAQ validation

- `question` 建议 `10` 到 `120` 字符
- `answer` 建议 `30` 到 `500` 字符
- FAQ 必须原创整理
- 不得整段复制官网帮助中心内容
- FAQ 不得包含虚构承诺

## Website URL Rules

`website` 是工具 canonical identity 的核心字段。

规则如下：

- 必须是官方站点或官方产品主页
- 必须使用 `https`，除非官方只提供 `http`
- 不使用 affiliate 链接
- 不使用重定向短链作为最终 canonical URL
- 不使用带明显 tracking 参数的 URL

## Logo Rules

Logo 用于目录卡片、详情页和搜索结果展示。

规则如下：

- 必须为绝对 URL
- 优先使用官方品牌资源
- 文件格式建议为 `png`、`svg`、`webp`
- 不允许损坏链接
- 不允许明显非品牌图的占位图片

## Screenshot Rules

Screenshot 为可选增强字段。

规则如下：

- 必须为绝对 URL
- 应来自官方页面、官方媒体包或可合法引用来源
- 不允许使用水印严重或来源不明图片
- 不应导入大量重复截图
- 单条工具建议 `1` 到 `5` 张

## SEO Rules

SEO 字段必须唯一、清晰、不过度堆砌关键词。

### SEO title rules

- 建议 `40` 到 `65` 字符
- 应包含工具名和核心价值
- 不应全部大写
- 不应堆砌多个分类词

### SEO description rules

- 建议 `120` 到 `160` 字符
- 应说明工具做什么、适合谁
- 不应写虚假比较结论

### SEO content rules

- 每个工具页的 SEO 文案必须独立
- 不允许多个工具共享完全相同的 SEO title 或 description
- category 词可用于辅助表达，但不应造成 keyword cannibalization

## Import Workflow

生产导入流程应固定如下：

1. CSV / JSON / Admin / Crawler source
2. Validation
3. Preview
4. Admin approval
5. Import
6. SEO generation or verification
7. Search indexing

### Workflow notes

- Validation 阶段只做格式、字段和规则校验
- Preview 阶段展示冲突、警告、分类映射结果和预计写入数据
- Admin approval 是发布前硬门槛
- Search indexing 必须在导入完成后异步执行

## Editorial Workflow

编辑流转应使用以下状态：

1. `Draft`
2. `Review`
3. `Approved`
4. `Published`
5. `Crawler updates`

### Editorial workflow rules

- `Draft` 可由导入模板、人工录入或 crawler enrichment 生成
- `Review` 必须验证分类、标签、价格、SEO 和原创性
- `Approved` 才允许进入正式导入
- `Published` 才允许出现在前台 sitemap 和索引
- `Crawler updates` 只能生成变更建议，不能自动覆盖人工审核内容

## Error Severity Model

建议未来导入器采用三级错误模型：

- `error`: 阻断导入
- `warning`: 允许进入 preview，但需人工确认
- `info`: 非阻断提示

### Blocking examples

- 重复 slug
- 重复 canonical website
- 缺少 required fields
- 无效 category
- 无效 website URL

### Warning examples

- SEO title 过长
- summary 过短
- logo 缺失
- screenshots 缺失

## Future Implementation Notes

后续实现导入器时，建议顺序如下：

1. 先实现 JSON validator
2. 再实现 CSV parser 到 canonical JSON record 的转换
3. 再实现 preview report
4. 再实现 admin approval workflow
5. 最后接入 search indexing 和 crawler enrichment

## Acceptance

本规范完成的标准如下：

- 已定义 required fields
- 已定义 optional fields
- 已定义 validation rules
- 已定义 slug rules
- 已定义 category mapping rules
- 已定义 tag rules
- 已定义 pricing rules
- 已定义 FAQ rules
- 已定义 website URL rules
- 已定义 logo rules
- 已定义 screenshot rules
- 已定义 SEO rules
- 已定义 import workflow
- 已定义 editorial workflow
- 未修改数据库 schema
- 未修改 API contract
- 未导入生产数据
