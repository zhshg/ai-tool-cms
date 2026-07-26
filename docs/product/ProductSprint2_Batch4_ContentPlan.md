# Product Sprint 2 - Batch 4 Content Plan

## Current Status

Batch 3 已经为 AI Tool Directory 提供了专业分类体系方向，当前系统也已经具备承载真实工具目录内容的基础能力，但内容层仍然主要停留在 demo 和示例阶段。

当前已确认的基础条件如下：

- `Category` 已支持层级关系，可通过 `parentId` 表达主分类与子分类。
- `ToolCategory` 已支持一个工具关联多个分类，并通过 `isPrimary` 标识主分类。
- `Tag` 已可作为扁平标签体系使用，适合承载功能点、平台、用户意图等非分类维度。
- `Tool` 已具备目录页和详情页所需的大部分基础字段，包括 `name`、`slug`、`summary`、`description`、`longDescription`、`website`、`logoUrl`、`pricingModel`、`metaTitle`、`metaDescription`、`metadata`、`publishedAt`、`status`。
- `PricingPlan`、`Faq` 等模型已经存在，可以支撑更完整的工具详情页内容。
- 当前 Tool Detail 页面已经能消费 `features`、`useCases`、`alternatives`、`similarTools`、`screenshots`、`faqs`、`jsonLd` 等扩展内容。
- 当前 Category 页面已经具备 Hero、Featured Tools、All Tools、Trending Tools、Related Categories、Sidebar、FAQ、Internal Links 等版块。

结论：Batch 4 不需要先做数据库重构，而应优先建立一套可审查、可扩展、可持续维护的真实 AI 工具内容导入与治理方案。

## 1. Content Import Strategy

### 目标

在不修改数据库 schema、不直接导入 200 到 500 个工具的前提下，先定义一套生产可用的内容导入方案，确保未来导入真实工具时具备以下特性：

- 可批量处理
- 可人工审核
- 可映射到新 taxonomy
- 可追踪来源
- 可逐步扩容
- 可控制 SEO 与内容质量风险

### 可选导入方式

#### 1. Seed-based import

适合场景：

- 本地开发环境初始化
- 演示环境快速生成目录内容
- 早期固定样本库管理

优点：

- 与当前项目结构最兼容
- 可通过代码审查控制质量
- 便于版本管理和回滚
- 适合前 50 个高质量样本工具

缺点：

- 扩展到 200 到 500 条后维护成本升高
- 不利于非工程角色参与内容运营
- 不适合作为长期唯一导入入口

#### 2. CSV/JSON import

适合场景：

- 从结构化内容源批量导入工具
- 内容运营团队整理 Excel 后转换导入
- 后续扩容到 200 到 500 个工具

优点：

- 结构清晰
- 易于批量校验和去重
- 适合建立标准导入模板
- 便于和 taxonomy 映射规则结合

缺点：

- 需要定义强约束字段格式
- 如果缺少审核流程，容易导入脏数据

#### 3. Crawler-based import

适合场景：

- 抓取工具官网基础元信息
- 定期补充 logo、title、canonical、公开 pricing 线索

优点：

- 扩容效率高
- 可降低手工录入成本

缺点：

- 法务与版权风险更高
- 易采集到不完整或不准确数据
- 难以直接保证内容原创性
- 不能作为首批生产内容的主要方式

#### 4. Manual admin import

适合场景：

- 高价值工具人工录入
- 编辑审核、纠错、更新
- 补齐 FAQ、use cases、related tools 等编辑内容

优点：

- 质量最高
- 适合运营团队持续维护

缺点：

- 速度慢
- 不适合一次性冷启动 200 到 500 条

#### 5. Hybrid approach

推荐组合方式：

- 结构化内容主干通过 `JSON/CSV import`
- 高质量示例集通过 `seed-based import`
- 基础公开信息辅助通过 `crawler-based enrichment`
- 最终上线前通过 `manual admin review`

### 推荐方案

当前项目最适合采用 `hybrid approach`。

推荐顺序如下：

1. 先定义统一导入格式，字段与 taxonomy 映射规则一次性定清。
2. 先制作 50 个高质量 demo/production-ready tools，作为导入模板样本。
3. 再扩充到 200 个 starter tools，验证分类、筛选、相关推荐、SEO 页面规模。
4. 最后再扩充到 500 个 production starter tools，并建立持续更新机制。

推荐原因：

- 当前项目已有 seed 能力，适合承载首批高质量样本。
- 当前 taxonomy 已成熟到足以开始映射，但还需要通过真实内容验证边界。
- 当前详情页与分类页结构已经足够丰富，真正缺的是高质量内容而不是更多代码结构。
- 混合导入方式可以兼顾工程可控性、运营效率与内容质量。

## 2. Tool Data Requirements

### 每个 AI Tool 的最小必备字段

以下字段应作为首批 50 到 200 个真实工具的最低标准：

- `name`
- `slug`
- `website`
- `logo`
- `short description`
- `long description`
- `primary category`
- `secondary categories`
- `tags`
- `pricing type`
- `features`
- `use cases`
- `target users`
- `alternatives`
- `FAQ`
- `SEO title`
- `SEO description`

### 字段定义建议

#### Required now

- `name`: 工具正式名称，以官网命名为准。
- `slug`: 稳定 URL 标识，避免品牌名重复和歧义。
- `website`: 官网主链接，优先 canonical URL。
- `logo`: 工具 logo 地址或规范化媒体资源引用。
- `short description`: 1 句摘要，用于卡片、列表页、SEO 摘要。
- `long description`: 详情页主体介绍，必须原创整理。
- `primary category`: 必须且仅能有一个。
- `secondary categories`: 可选多个，用于交叉发现。
- `tags`: 非分类型标签。
- `pricing type`: 如 `Free`、`Freemium`、`Paid`、`Custom`、`Trial`。
- `features`: 3 到 8 个核心能力点。
- `use cases`: 3 到 6 个用户任务场景。
- `target users`: 目标用户群体，如 marketers、developers、students。
- `SEO title`
- `SEO description`

#### Recommended later

- `screenshots`
- `faq items`
- `pricing plans`
- `supported platforms`
- `supported languages`
- `api availability`
- `integrations`
- `launch year`
- `founder/company`
- `popularity signals`
- `editor notes`

### 与当前 schema 的承载方式

#### Current schema-native

当前 schema 已能直接承载：

- `name`
- `slug`
- `website`
- `logoUrl`
- `summary`
- `description`
- `longDescription`
- `pricingModel`
- `metaTitle`
- `metaDescription`
- `categories`
- `tags`
- `faq`
- `pricing plans`

#### Current metadata-backed

当前适合先放在 `metadata` 或页面聚合层中的扩展字段：

- `features`
- `use cases`
- `target users`
- `alternatives`
- `supported platforms`
- `supported languages`
- `screenshots`
- `editorial notes`
- `popularity markers`

结论：当前 schema 足以启动真实工具目录内容建设，不应因“字段还不够完美”而阻塞 Batch 4。

## 3. Category Mapping Strategy

### 映射目标

所有工具必须映射到 Batch 3 定义的专业 taxonomy，避免继续维持“工具很多，但分类混乱”的目录问题。

### 映射规则

- 每个工具必须有且只有 `exactly one primary category`。
- 每个工具可以有多个 `secondary categories`。
- `tags` 不能重复表达分类概念。
- `use cases` 应表达用户意图，而不是重复 taxonomy 名称。
- `related categories` 应根据主分类、次分类和常见使用路径生成。

### 映射层级

#### Primary category

用于：

- 工具 canonical 分类归属
- 主详情页 breadcrumb
- 主 category URL 下的目录聚合
- sitemap 主归档逻辑

推荐示例：

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

#### Secondary categories

用于：

- 工具跨场景曝光
- Related tools 召回
- Collection page 聚合
- 搜索与筛选增强

例如：

- 一个 AI blog writer 的 primary category 可为 `Writing`
- secondary categories 可为 `SEO`、`Marketing`

#### Tags

标签应聚焦于非层级维度，例如：

- 平台：`Web`、`Chrome Extension`、`API`
- 模式：`No-code`、`Enterprise`
- 功能：`Summarization`、`Transcription`、`Prompting`
- 受众：`Students`、`Marketers`、`Developers`

不应把以下内容当 tag 重复出现：

- `Writing`
- `Image`
- `SEO`

因为这些已经属于 category 体系。

#### Use cases

use cases 应描述用户任务，例如：

- Write blog posts faster
- Generate ad copy
- Summarize research papers
- Create product demo videos

不应写成：

- Writing tool
- SEO tool

### Related categories 规则

推荐从以下关系生成：

- 主分类的常见相邻分类
- 共享同一 use case 的分类
- 在同一 buyer journey 中连续出现的分类

例如：

- Writing -> SEO
- SEO -> Marketing
- Marketing -> Sales
- Productivity -> Automation
- Code -> Data

## 4. Content Quality Rules

### 核心原则

内容质量是 Batch 4 的第一优先级。目录一旦导入 200 到 500 个工具，低质量内容会直接影响 SEO、品牌信任和后续运营效率。

### 质量规则

- 不复制受版权保护的长篇官网文案。
- 不直接抓取并复用第三方长篇评测内容。
- 不写夸张、无法验证的效果承诺。
- 不写误导性 claims，例如 “best”, “#1”, “guaranteed” 除非有明确来源。
- 不生成虚假用户评论。
- 不编造价格信息。
- 不展示未经验证的评分。
- 工具描述必须原创整理，可基于公开事实改写，但不得机械搬运。
- AI 生成文案必须可人工审核、可追溯、可修改。
- 所有内容必须保留来源依据，至少在内部导入表中记录 source URL。

### 审核建议

每条工具内容建议经过以下流程：

1. 收集公开事实
2. 结构化录入字段
3. AI 生成或辅助整理摘要
4. 人工审核分类、标签、价格、描述
5. 再进入 seed/import 数据集

## 5. Seed Data Strategy

### 方案对比

#### 50 demo tools

优点：

- 最快完成
- 便于验证 taxonomy 和页面结构
- 适合建立内容标准模板

缺点：

- 对目录站 SEO 和内链价值有限
- 分类页内容密度偏低
- 筛选和相关推荐效果不足

#### 200 starter tools

优点：

- 足以形成初步目录规模
- 分类页、相关推荐、热门工具、筛选都有更真实的数据基础
- 可开始验证 sitemap 与 crawl depth 效果

缺点：

- 需要更明确的数据治理机制
- 人工审核成本明显上升

#### 500 production starter tools

优点：

- 更接近可运营目录站
- 足以支撑较多 category、subcategory、collection 页面
- 更有利于 internal linking 和长尾 SEO

缺点：

- 如果 taxonomy 或质量规则尚未稳定，返工成本很高
- 容易在冷启动阶段导入低质量或不一致数据

### 推荐策略

不建议一开始就直接追求 500。

推荐路线：

1. 先做 `50 high-quality tools`
2. 稳定后扩展到 `200 starter tools`
3. 再逐步扩展到 `500 production starter tools`

理由：

- 先验证 taxonomy 是否真的适配真实工具
- 先验证详情页与分类页内容结构是否足够承载
- 先验证去重、SEO、标签、相关推荐规则
- 降低一次性导入大量低质量内容的风险

## 6. Data Source Strategy

### 推荐安全来源

- 工具官方官网
- 官方产品页面
- 官方定价页面
- 官方帮助中心或 docs 首页
- 官方博客
- 官方 GitHub 仓库
- Hugging Face 公共模型/应用页面
- Product Hunt metadata（在允许的前提下，仅取基础元信息）
- 官方 RSS feed
- 官方社交账号中可验证的公开产品信息

### 来源使用原则

- 官网作为第一事实来源
- GitHub 用于补充技术能力、开源状态、集成信息
- 官方博客用于补充 use cases、更新动态和产品定位
- Product Hunt 仅可作为辅助发现来源，不应作为唯一事实来源
- Hugging Face 适用于模型型或 demo 型 AI 工具，但仍应以项目官方介绍为主

### 明确不推荐

- 抓取第三方评测文章的大段正文
- 抄写竞争目录站的描述文本
- 采集未经授权的完整用户评论
- 大规模复制 FAQ、博客正文或帮助中心全文

## 7. Tool Detail Enhancement Plan

当前 Tool Detail 页面结构已经具备较强承载能力，Batch 4 的重点不是重新设计页面，而是让导入数据真正填满这些模块。

### Hero

应使用：

- 工具名称
- logo
- 一句话 summary
- pricing badge
- primary category
- secondary categories
- 官方网站 CTA

### Summary

应显示：

- 2 到 3 句原创简介
- 核心适用人群
- 核心使用场景

### Features

应展示：

- 3 到 8 个核心功能点
- 每个功能点使用简明可验证的表达

### Pricing

应展示：

- pricing type
- 如有公开 pricing plan，则展示起步计划或方案差异
- 未验证价格时只显示高层级 pricing type，不展示具体金额

### Categories

应展示：

- primary category
- secondary categories
- breadcrumb 与内部链接

### Tags

应展示：

- 平台
- 用户群
- 功能型标签

### Similar tools

应基于：

- primary category
- shared tags
- shared use cases
- similar pricing

### Alternatives

应展示：

- 同主分类的常见替代工具
- 同 use case 的跨分类替代工具

### FAQ

应包含：

- 这个工具做什么
- 是否免费
- 适合谁
- 是否支持 API / 团队 / 多语言（如可验证）

### Screenshots

如有公开可用截图资源，应展示：

- 产品首页
- 核心工作界面
- 关键生成结果示例

前提是图片来源明确且可合法使用。

## 8. Recommendation and Related Tools Plan

### 目标

相关推荐不应只是“同分类随机推荐”，而应成为目录深度浏览和 SEO internal linking 的核心机制。

### 推荐维度

建议采用加权打分：

- `primary category match`
- `secondary category overlap`
- `tag overlap`
- `pricing similarity`
- `use case similarity`
- `target user similarity`
- `popularity`
- `freshness`
- `embeddings similarity`（如果后续具备）

### 推荐优先级建议

#### Similar tools

更强调：

- 同 primary category
- 同 use case
- 同 pricing band

#### Alternatives

更强调：

- 功能可替代
- 面向同类用户
- 可能分布在不同 secondary categories

#### Trending tools

更强调：

- 新发布
- 热度上升
- 编辑推荐

#### Editor's picks

更强调：

- 内容完整度
- 品牌可信度
- 代表性 use case

### 后续演进建议

第一阶段先用规则引擎实现。

后续如果具备 embedding 或搜索相关度能力，再增加语义相似推荐，但不能在没有可解释性的情况下完全替代规则层。

## 9. Search and Filter Plan

### 必备筛选项

- `category`
- `pricing`
- `tag`
- `platform`
- `language`
- `use case`
- `popularity`
- `newest`

### 筛选设计原则

- `category` 是主筛选维度，应支持 primary 和 secondary 映射。
- `pricing` 应先支持高层级模式，不急于展示复杂 plan 细节。
- `tag` 应聚焦功能、平台、受众，不重复 category。
- `platform` 应覆盖 Web、Mobile、Chrome Extension、API、Desktop 等。
- `language` 对国际工具目录非常重要，应尽早纳入。
- `use case` 可以作为更接近用户意图的高级筛选。
- `popularity` 需要谨慎定义，可先基于编辑评分、流量、点击、更新时间等内部信号。
- `newest` 适合首页、分类页、sidebar 和 sitemap 更新策略。

### 筛选落地建议

在 50 条工具阶段：

- 优先验证 `category`、`pricing`、`tag`

在 200 条工具阶段：

- 补充 `platform`、`language`、`use case`

在 500 条工具阶段：

- 再增强 `popularity`、`newest`、组合筛选体验

## 10. SEO Plan

### Tool pages

每个工具页应生成：

- 唯一 URL
- 唯一 SEO title
- 唯一 SEO description
- category breadcrumb
- related links
- FAQ 内容
- tool JSON-LD（在现有能力基础上继续复用）

### Category pages

每个 category 页应承载：

- category intro
- featured tools
- trending tools
- all tools
- related categories
- popular collections
- FAQ

真实工具导入后，category 页才会真正具备规模化 SEO 价值。

### Collection pages

后续建议围绕 use cases、pricing、platform、audience 建 collection，例如：

- Best AI tools for students
- Free AI writing tools
- AI SEO tools for agencies
- AI coding tools with API access

Collection 页面应避免和 category 页面关键词冲突。

### Sitemap entries

导入后应确保：

- tool pages 进入 sitemap
- category pages 进入 sitemap
- collection pages 进入 sitemap
- 仅收录可索引、已发布、非重复内容

### Internal links

应重点强化：

- tool -> category
- tool -> related tools
- tool -> alternatives
- category -> subcategory
- category -> related categories
- category -> collections
- homepage -> top categories / popular categories

### JSON-LD

当前已有 JSON-LD 支持，应继续保持，不建议在 Batch 4 规划阶段重构。

建议后续确保：

- Tool detail 使用结构化数据
- Breadcrumb 结构化数据保持一致
- FAQ 如已支持则继续复用

原则是“扩内容，不破坏现有 SEO 结构”。

## 11. Implementation Roadmap

### Batch 4A: Create content import format

目标：

- 定义统一 JSON/CSV 导入格式
- 定义字段字典
- 定义 source tracking 规则
- 定义 category/tag/use case 映射规则
- 定义人工审核流程

产出：

- 导入模板
- 字段规范
- 质量校验清单

### Batch 4B: Add 50 high-quality demo tools

目标：

- 先落 50 个高质量真实工具
- 覆盖核心 primary categories
- 验证 taxonomy 与页面承载能力

产出：

- 第一批 production-grade 样本数据
- 页面内容完整度验证

### Batch 4C: Expand to 200 starter tools

目标：

- 将覆盖面扩展到主流 AI 工具生态
- 完善筛选、分类、相关推荐所需的数据密度

产出：

- 200 条 starter 级工具内容
- category 页面规模验证

### Batch 4D: Map tools to professional taxonomy

目标：

- 全量完成 primary/secondary category 映射
- 清理重复标签
- 补齐 related categories 和 use cases

产出：

- taxonomy 一致化
- 内链结构更稳定

### Batch 4E: Improve tool detail and related tools

目标：

- 基于真实内容增强详情页信息密度
- 完善 similar tools、alternatives、trending tools

产出：

- 更强的用户浏览深度
- 更好的内部链接网络

### Batch 4F: Verify SEO and sitemap

目标：

- 验证 sitemap
- 验证 metadata 唯一性
- 验证 internal linking
- 验证 JSON-LD 未被破坏

产出：

- 上线前 SEO 质量核查结果

## 12. Acceptance Criteria

本次 Batch 4 Preparation 规划任务完成的标准如下：

- 已明确 200 到 500 个 AI tools 的内容导入策略
- 已定义每个工具的必备字段与推荐字段
- 已定义 professional taxonomy 下的分类映射规则
- 已定义内容质量与审核规则
- 已明确 seed、CSV/JSON、crawler、manual、hybrid 的适用方式
- 已给出 50 / 200 / 500 三档内容建设策略建议
- 已定义 tool detail、related tools、search/filter、SEO 的内容使用方向
- 已拆分 Batch 4A 到 4F 的实施路线
- 本任务未修改代码
- 本任务未修改 seed 文件
- 本任务未修改数据库 schema
- 本任务未导入任何数据

## Final Recommendation

不建议在 taxonomy 尚未确认、字段标准尚未冻结、质量规则尚未建立前，直接批量导入 200 到 500 个工具。

更稳妥的做法是：

1. 先冻结 taxonomy 和导入格式。
2. 再制作 50 个高质量真实工具样本。
3. 通过样本验证分类、详情页、相关推荐、筛选和 SEO。
4. 最后再扩容到 200 和 500。

这样项目才能从“有框架”顺利进入“有内容、可运营、可持续扩展”的阶段。
