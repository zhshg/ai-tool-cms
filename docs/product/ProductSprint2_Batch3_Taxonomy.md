# Product Sprint 2 - Batch 3 Professional Taxonomy

## Scope

本批次目标是为 AI Tool CMS 设计一套适合生产级 AI Tool Directory 的专业 taxonomy architecture。

本次工作：

- 复核当前 taxonomy
- 设计 primary categories
- 设计 subcategories
- 设计导航层级
- 设计 homepage category module
- 设计 related-category 关系
- 设计 editorial foundation
- 设计 URL strategy
- 设计 internal linking strategy
- 输出实施路线图

本次不做：

- 不改数据库 schema
- 不做 Prisma migration
- 不做 API redesign
- 不做 Admin CRUD redesign

## Executive Summary

当前系统已经具备 category 基础能力，但 taxonomy 仍然是“平铺型功能分类”，还没有达到专业 AI Tool Directory 的信息架构水平。

主要问题：

- 类目命名粒度混杂
- 一级类目与二级类目角色不清
- 有些类目是能力类型，有些是部门场景，有些是媒介形式
- 存在重叠与交叉覆盖
- 缺少明确的 parent-child hierarchy
- 缺少 category relationship model
- 缺少可持续的 editorial taxonomy

推荐方向：

- 建立“两层主 taxonomy + 一层 editorial/collection 扩展”的结构
- 第一层使用稳定、可长期扩展的 primary categories
- 第二层使用面向用户搜索意图和导航意图的 subcategories
- 继续沿用现有 `Category` + `parentId` schema 表达 hierarchy
- 将 tag、collection、guide、compare page 作为分类的周边导航体系，而不是继续塞进 category 主体

结论：

- 当前 category system 可以承载专业 taxonomy 的第一阶段落地
- 不需要 schema redesign 就能开始 taxonomy restructuring
- 后续重点应放在 taxonomy content governance、navigation 和 editorial strategy，而不是数据库层重构

## Current Taxonomy

### Current seeded categories

当前公开 seed 中的主要 categories 为：

- AI Writing
- Image Generation
- Code Assistant
- Productivity
- Video & Audio
- Research
- Presentation
- Design
- Sales
- Marketing
- SEO
- Customer Support
- Education
- Finance
- HR
- Legal
- Data Analysis
- Automation
- E-commerce
- Recruiting
- Translation
- Social Media

### Current taxonomy characteristics

当前 taxonomy 的特点：

- 单层平铺
- 无明确 parent-child 结构
- 多数 category 同时承担“导航类目”和“搜索关键词”角色
- 命名方式不统一

当前混用了四种不同维度：

- 媒介类型：
  - Image Generation
  - Video & Audio
  - Presentation
- 功能能力：
  - Code Assistant
  - SEO
  - Automation
  - Translation
- 工作流 / use case：
  - Research
  - Productivity
  - Customer Support
- 业务部门：
  - Sales
  - Marketing
  - HR
  - Finance
  - Legal

### Current taxonomy problems

#### 1. Duplicate or overlapping categories

存在明显重叠：

- `Marketing` 与 `Social Media`
  - `Social Media` 更像 `Marketing` 下的子类
- `HR` 与 `Recruiting`
  - `Recruiting` 更像 `HR` 或 `Business` 下的子类
- `Design` 与 `Image Generation`
  - 一部分工具属于视觉创作，一部分属于设计工作流，两者边界不清
- `Research` 与 `Data Analysis`
  - 用户意图和工具形态存在部分交叉
- `Presentation` 与 `Productivity`
  - `Presentation` 是明确 use case，但在导航层可作为二级类目更合适
- `Video & Audio`
  - 把两个一级概念绑在一起，不利于后续扩展

#### 2. Unclear naming

命名不统一：

- `AI Writing` 带 `AI`
- `Code Assistant` 是工具角色
- `SEO` 是领域
- `Video & Audio` 是双域组合
- `Data Analysis` 是任务描述
- `E-commerce` 是业务 vertical

这会导致：

- slug style 不统一
- breadcrumb 不自然
- category relationship 难建立
- 后续子分类扩展困难

#### 3. Missing major categories

缺失或不完整的重要大类：

- Audio
- Video
- Writing
- Business
- Data
- Developer / Code
- Customer Service / Support（现有但命名可优化）
- Operations
- Meetings / Notes / Knowledge
- AI Agents
- Chatbots

#### 4. Lack of hierarchical intent

当前 taxonomy 不能清晰表达：

- 顶层导航入口
- 子主题入口
- 编辑型聚合入口
- 横向相关推荐路径

## Recommended Taxonomy

推荐使用两层结构：

- Level 1：Primary Categories
- Level 2：Subcategories

设计原则：

- Primary category 必须稳定、宽泛、长期可持续
- Subcategory 必须有清晰用户意图
- URL 要统一
- 分类不要和 tag / collection / buying guide 混淆

## Primary Categories

推荐 primary categories 如下。

### 1. Writing

- `name`: Writing
- `slug`: `writing`
- `icon`: `pen-square`
- `short description`: AI tools for drafting, rewriting, editing, and structured written communication.
- `SEO summary`: Discover AI writing tools for blog posts, copywriting, email, social content, documentation, and editing workflows.

### 2. Image

- `name`: Image
- `slug`: `image`
- `icon`: `image`
- `short description`: AI tools for generating, editing, enhancing, and transforming images.
- `SEO summary`: Explore AI image tools for generation, editing, product visuals, logo creation, portraits, and creative workflows.

### 3. Video

- `name`: Video
- `slug`: `video`
- `icon`: `clapperboard`
- `short description`: AI tools for video generation, editing, avatars, clipping, and repurposing.
- `SEO summary`: Compare AI video tools for video generation, editing, avatar videos, short-form repurposing, and production workflows.

### 4. Audio

- `name`: Audio
- `slug`: `audio`
- `icon`: `mic-2`
- `short description`: AI tools for voice, transcription, speech synthesis, and audio cleanup.
- `SEO summary`: Find AI audio tools for transcription, voice generation, dubbing, speech cleanup, and podcast workflows.

### 5. Code

- `name`: Code
- `slug`: `code`
- `icon`: `code-2`
- `short description`: AI tools for coding, review, debugging, DevOps, and developer productivity.
- `SEO summary`: Browse AI coding tools for code generation, code review, debugging, APIs, DevOps, and software delivery.

### 6. Productivity

- `name`: Productivity
- `slug`: `productivity`
- `icon`: `briefcase-business`
- `short description`: AI tools for notes, meetings, task management, and knowledge workflows.
- `SEO summary`: Discover AI productivity tools for note-taking, meeting summaries, task planning, assistants, and knowledge management.

### 7. Marketing

- `name`: Marketing
- `slug`: `marketing`
- `icon`: `megaphone`
- `short description`: AI tools for campaigns, content, ads, landing pages, and growth execution.
- `SEO summary`: Explore AI marketing tools for campaign planning, content creation, ad creative, landing pages, and growth workflows.

### 8. SEO

- `name`: SEO
- `slug`: `seo`
- `icon`: `search-check`
- `short description`: AI tools for keyword research, content optimization, technical SEO, and programmatic search growth.
- `SEO summary`: Compare AI SEO tools for keyword research, on-page optimization, technical SEO, content planning, and programmatic SEO.

### 9. Research

- `name`: Research
- `slug`: `research`
- `icon`: `library-big`
- `short description`: AI tools for summarization, source comparison, fact gathering, and analysis.
- `SEO summary`: Find AI research tools for summarizing documents, comparing sources, extracting insights, and evidence gathering.

### 10. Education

- `name`: Education
- `slug`: `education`
- `icon`: `graduation-cap`
- `short description`: AI tools for teaching, tutoring, quizzes, course materials, and student support.
- `SEO summary`: Browse AI education tools for tutoring, quizzes, lesson creation, course design, and academic assistance.

### 11. Automation

- `name`: Automation
- `slug`: `automation`
- `icon`: `workflow`
- `short description`: AI tools for workflow automation, app orchestration, and trigger-based actions.
- `SEO summary`: Explore AI automation tools for workflow orchestration, triggers, integrations, no-code automation, and agentic execution.

### 12. Business

- `name`: Business
- `slug`: `business`
- `icon`: `building-2`
- `short description`: AI tools for finance, HR, legal, operations, and back-office workflows.
- `SEO summary`: Compare AI business tools for finance, HR, recruiting, legal, operations, and internal business systems.

### 13. Design

- `name`: Design
- `slug`: `design`
- `icon`: `palette`
- `short description`: AI tools for UI, branding, layouts, creative direction, and product design.
- `SEO summary`: Discover AI design tools for UI design, branding, layouts, design systems, and creative production.

### 14. Data

- `name`: Data
- `slug`: `data`
- `icon`: `chart-column`
- `short description`: AI tools for analytics, spreadsheets, dashboards, and data interpretation.
- `SEO summary`: Find AI data tools for spreadsheets, dashboards, data analysis, querying, and business intelligence workflows.

### 15. Sales

- `name`: Sales
- `slug`: `sales`
- `icon`: `badge-dollar-sign`
- `short description`: AI tools for prospecting, outreach, CRM workflows, and revenue operations.
- `SEO summary`: Explore AI sales tools for prospecting, outreach, CRM workflows, sales coaching, and revenue execution.

### 16. Customer Support

- `name`: Customer Support
- `slug`: `customer-support`
- `icon`: `life-buoy`
- `short description`: AI tools for ticket deflection, support agents, help centers, and customer conversations.
- `SEO summary`: Compare AI customer support tools for ticket handling, help centers, agent assist, chat support, and support automation.

## Subcategories

以下为推荐 subcategory 设计。

## Writing Subcategories

- Blog Writing
  - `parent`: Writing
  - `slug`: `blog-writing`
  - `description`: Tools for long-form blog drafts, outlines, rewrites, and SEO article production.
  - `recommended tools`: Jasper, Copy.ai, Writesonic

- Copywriting
  - `parent`: Writing
  - `slug`: `copywriting`
  - `description`: Tools focused on sales copy, product copy, landing page copy, and ads.
  - `recommended tools`: Copy.ai, Anyword, Jasper

- Email Writing
  - `parent`: Writing
  - `slug`: `email-writing`
  - `description`: Tools for cold email, lifecycle email, newsletters, and response drafting.
  - `recommended tools`: Lavender, Smartwriter, Jasper

- Social Media Writing
  - `parent`: Writing
  - `slug`: `social-media-writing`
  - `description`: Tools for captions, threads, repurposing, and channel-specific social content.
  - `recommended tools`: Ocoya, Buffer AI, Predis.ai

- Documentation
  - `parent`: Writing
  - `slug`: `documentation`
  - `description`: Tools for technical docs, SOPs, internal documentation, and knowledge articles.
  - `recommended tools`: Notion AI, Slab, Guru

## Image Subcategories

- Image Generation
  - `parent`: Image
  - `slug`: `image-generation`
  - `description`: Tools for text-to-image generation and concept ideation.
  - `recommended tools`: Midjourney, Leonardo AI, Ideogram

- Image Editing
  - `parent`: Image
  - `slug`: `image-editing`
  - `description`: Tools for retouching, expansion, cleanup, and image transformation.
  - `recommended tools`: Adobe Firefly, Canva, Pixlr

- Logo Design
  - `parent`: Image
  - `slug`: `logo-design`
  - `description`: Tools for logo concepts, identity marks, and simple brand assets.
  - `recommended tools`: Looka, Brandmark, Canva

- Portrait
  - `parent`: Image
  - `slug`: `portrait`
  - `description`: Tools for profile photos, headshots, character portraits, and avatar imagery.
  - `recommended tools`: HeadshotPro, Remini, ProfilePicture.AI

- Product Visuals
  - `parent`: Image
  - `slug`: `product-visuals`
  - `description`: Tools for product mockups, merchandising, and catalog image generation.
  - `recommended tools`: Pebblely, Flair AI, Booth AI

## Video Subcategories

- Video Generation
  - `parent`: Video
  - `slug`: `video-generation`
  - `description`: Tools for text-to-video and idea-to-video workflows.
  - `recommended tools`: Runway, Pika, Luma

- Video Editing
  - `parent`: Video
  - `slug`: `video-editing`
  - `description`: Tools for editing, clipping, captioning, and timeline enhancement.
  - `recommended tools`: Descript, Kapwing, VEED

- Avatar Video
  - `parent`: Video
  - `slug`: `avatar-video`
  - `description`: Tools for presenter avatars, talking head generation, and synthetic presenters.
  - `recommended tools`: Synthesia, HeyGen, D-ID

- Short-form Repurposing
  - `parent`: Video
  - `slug`: `short-form-repurposing`
  - `description`: Tools for extracting clips and turning long-form video into shorts.
  - `recommended tools`: Opus Clip, Vidyo.ai, Klap

## Audio Subcategories

- Transcription
  - `parent`: Audio
  - `slug`: `transcription`
  - `description`: Tools for audio and meeting transcription.
  - `recommended tools`: Otter, Fireflies, AssemblyAI

- Voice Generation
  - `parent`: Audio
  - `slug`: `voice-generation`
  - `description`: Tools for text-to-speech, narration, and synthetic voice workflows.
  - `recommended tools`: ElevenLabs, PlayHT, Murf

- Audio Editing
  - `parent`: Audio
  - `slug`: `audio-editing`
  - `description`: Tools for noise reduction, cleanup, and voice enhancement.
  - `recommended tools`: Adobe Podcast, Krisp, Descript

- Dubbing
  - `parent`: Audio
  - `slug`: `dubbing`
  - `description`: Tools for multilingual dubbing and localized voice content.
  - `recommended tools`: Rask AI, Papercup, ElevenLabs

## Code Subcategories

- Code Assistant
  - `parent`: Code
  - `slug`: `code-assistant`
  - `description`: Tools for code generation, autocomplete, and coding support.
  - `recommended tools`: GitHub Copilot, Cursor, Cody

- Code Review
  - `parent`: Code
  - `slug`: `code-review`
  - `description`: Tools for review suggestions, quality checks, and PR assistance.
  - `recommended tools`: CodeRabbit, Bito, Codium

- DevOps
  - `parent`: Code
  - `slug`: `devops`
  - `description`: Tools for CI/CD, operations workflows, deployment support, and infra assistance.
  - `recommended tools`: Harness, GitLab Duo, Kubiya

- API
  - `parent`: Code
  - `slug`: `api`
  - `description`: Tools for API testing, generation, documentation, and integration workflows.
  - `recommended tools`: Postman AI, Mintlify, Stainless

- Debugging
  - `parent`: Code
  - `slug`: `debugging`
  - `description`: Tools for troubleshooting, stack trace analysis, and error understanding.
  - `recommended tools`: Sentry AI, Rollbar, Bito

## Productivity Subcategories

- Note Taking
  - `parent`: Productivity
  - `slug`: `note-taking`
  - `description`: Tools for personal notes, capture, summaries, and organization.
  - `recommended tools`: Notion AI, Reflect, Mem

- Meeting Assistant
  - `parent`: Productivity
  - `slug`: `meeting-assistant`
  - `description`: Tools for meeting notes, summaries, and follow-up actions.
  - `recommended tools`: Otter, Fireflies, tl;dv

- Knowledge Management
  - `parent`: Productivity
  - `slug`: `knowledge-management`
  - `description`: Tools for internal knowledge retrieval, company memory, and Q&A.
  - `recommended tools`: Guru, Glean, Notion AI

- Task Management
  - `parent`: Productivity
  - `slug`: `task-management`
  - `description`: Tools for planning, prioritization, and action orchestration.
  - `recommended tools`: ClickUp AI, Asana AI, Motion

## Marketing Subcategories

- Content Marketing
  - `parent`: Marketing
  - `slug`: `content-marketing`
  - `description`: Tools for campaign content, editorial planning, and publishing workflows.
  - `recommended tools`: Jasper, Copy.ai, Writer

- Ad Creative
  - `parent`: Marketing
  - `slug`: `ad-creative`
  - `description`: Tools for ad copy, visual creative, and campaign variants.
  - `recommended tools`: AdCreative.ai, Pencil, Canva

- Landing Pages
  - `parent`: Marketing
  - `slug`: `landing-pages`
  - `description`: Tools for landing page generation, optimization, and conversion-focused copy.
  - `recommended tools`: Unbounce, Instapage, Durable

- Social Media
  - `parent`: Marketing
  - `slug`: `social-media`
  - `description`: Tools for planning, scheduling, repurposing, and social performance workflows.
  - `recommended tools`: Buffer AI, Ocoya, Predis.ai

## SEO Subcategories

- Keyword Research
  - `parent`: SEO
  - `slug`: `keyword-research`
  - `description`: Tools for keyword ideas, intent analysis, and topical planning.
  - `recommended tools`: Semrush, Ahrefs, Surfer

- On-page SEO
  - `parent`: SEO
  - `slug`: `on-page-seo`
  - `description`: Tools for optimization, outlines, content scoring, and on-page recommendations.
  - `recommended tools`: Surfer, Frase, Clearscope

- Technical SEO
  - `parent`: SEO
  - `slug`: `technical-seo`
  - `description`: Tools for audits, crawl issues, structure, and indexability monitoring.
  - `recommended tools`: Screaming Frog, Sitebulb, JetOctopus

- Programmatic SEO
  - `parent`: SEO
  - `slug`: `programmatic-seo`
  - `description`: Tools and workflows for scalable page generation and search-driven landing systems.
  - `recommended tools`: AirOps, Byword, custom CMS stacks

## Research Subcategories

- Summarization
  - `parent`: Research
  - `slug`: `summarization`
  - `description`: Tools for summarizing long documents, notes, and source material.
  - `recommended tools`: Perplexity, ChatGPT, Claude

- Source Comparison
  - `parent`: Research
  - `slug`: `source-comparison`
  - `description`: Tools for comparing perspectives, evidence, and multiple references.
  - `recommended tools`: Perplexity, Elicit, Consensus

- Document Q&A
  - `parent`: Research
  - `slug`: `document-qa`
  - `description`: Tools for asking questions over PDFs, reports, and knowledge corpora.
  - `recommended tools`: Humata, AskYourPDF, ChatPDF

## Education Subcategories

- Tutoring
  - `parent`: Education
  - `slug`: `tutoring`
  - `description`: Tools for personalized tutoring and learning support.
  - `recommended tools`: Khanmigo, Quizlet AI, Socratic

- Quiz Generation
  - `parent`: Education
  - `slug`: `quiz-generation`
  - `description`: Tools for quizzes, assessments, and practice materials.
  - `recommended tools`: Quizizz AI, Quizlet, MagicSchool

- Lesson Planning
  - `parent`: Education
  - `slug`: `lesson-planning`
  - `description`: Tools for generating lesson outlines, activities, and teaching resources.
  - `recommended tools`: MagicSchool, Curipod, Eduaide

## Automation Subcategories

- Workflow Automation
  - `parent`: Automation
  - `slug`: `workflow-automation`
  - `description`: Tools for multi-step task automation and orchestration.
  - `recommended tools`: Zapier, Make, n8n

- AI Agents
  - `parent`: Automation
  - `slug`: `ai-agents`
  - `description`: Tools for autonomous or semi-autonomous agent workflows.
  - `recommended tools`: AutoGen, CrewAI, Lindy

- No-code Automation
  - `parent`: Automation
  - `slug`: `no-code-automation`
  - `description`: Tools for business users to automate tasks without engineering support.
  - `recommended tools`: Zapier, Make, Pipedream

## Business Subcategories

- Finance
  - `parent`: Business
  - `slug`: `finance`
  - `description`: Tools for reporting, forecasting, analysis, and finance ops.
  - `recommended tools`: Datarails, Mosaic, Pigment

- HR
  - `parent`: Business
  - `slug`: `hr`
  - `description`: Tools for people ops, onboarding, internal enablement, and HR tasks.
  - `recommended tools`: Leena AI, Lattice, Culture Amp

- Recruiting
  - `parent`: Business
  - `slug`: `recruiting`
  - `description`: Tools for sourcing, screening, and interview workflow support.
  - `recommended tools`: Ashby, HireVue, SeekOut

- Legal
  - `parent`: Business
  - `slug`: `legal`
  - `description`: Tools for contract review, legal research, and document analysis.
  - `recommended tools`: Harvey, Spellbook, Luminance

## Design Subcategories

- UI Design
  - `parent`: Design
  - `slug`: `ui-design`
  - `description`: Tools for product UI, screens, wireframes, and interaction concepts.
  - `recommended tools`: Figma AI, Uizard, Galileo

- Branding
  - `parent`: Design
  - `slug`: `branding`
  - `description`: Tools for brand systems, visuals, and identity assets.
  - `recommended tools`: Looka, Canva, Adobe Firefly

- Presentation Design
  - `parent`: Design
  - `slug`: `presentation-design`
  - `description`: Tools for decks, story visuals, and presentation polish.
  - `recommended tools`: Gamma, Tome, Beautiful.ai

## Data Subcategories

- Data Analysis
  - `parent`: Data
  - `slug`: `data-analysis`
  - `description`: Tools for explaining trends, summarizing datasets, and analytic workflows.
  - `recommended tools`: Julius, ChatGPT Advanced Data Analysis, Hex

- Spreadsheet AI
  - `parent`: Data
  - `slug`: `spreadsheet-ai`
  - `description`: Tools for formula help, spreadsheet analysis, and model interpretation.
  - `recommended tools`: Rows AI, SheetAI, Formula Bot

- Dashboards
  - `parent`: Data
  - `slug`: `dashboards`
  - `description`: Tools for analytics presentation and stakeholder reporting.
  - `recommended tools`: Tableau Pulse, Power BI Copilot, Looker

## Sales Subcategories

- Prospecting
  - `parent`: Sales
  - `slug`: `prospecting`
  - `description`: Tools for lead discovery, account research, and target selection.
  - `recommended tools`: Apollo, Clay, Common Room

- Outreach
  - `parent`: Sales
  - `slug`: `outreach`
  - `description`: Tools for outbound messaging, personalization, and sequence workflows.
  - `recommended tools`: Outreach, Salesloft, Lavender

- Sales Coaching
  - `parent`: Sales
  - `slug`: `sales-coaching`
  - `description`: Tools for conversation review, call feedback, and rep enablement.
  - `recommended tools`: Gong, Chorus, Avoma

## Customer Support Subcategories

- Help Center
  - `parent`: Customer Support
  - `slug`: `help-center`
  - `description`: Tools for support content, knowledge bases, and self-service support.
  - `recommended tools`: Intercom, Zendesk AI, Help Scout

- Agent Assist
  - `parent`: Customer Support
  - `slug`: `agent-assist`
  - `description`: Tools for live support agents, suggestions, and ticket handling.
  - `recommended tools`: Intercom Fin, Zendesk AI, Ada

- Chat Support
  - `parent`: Customer Support
  - `slug`: `chat-support`
  - `description`: Tools for customer chatbots and support automation.
  - `recommended tools`: Ada, Forethought, Intercom Fin

## Homepage Navigation

推荐首页 category module 拆成四种模块，而不是只显示一个平铺列表。

### 1. Top Categories

面向主导航稳定入口：

- Writing
- Image
- Video
- Code
- Productivity
- Marketing
- SEO
- Automation

### 2. Popular Categories

面向当前工具数量和用户兴趣：

- Writing
- Image
- Code
- Marketing
- Productivity
- SEO

### 3. Recently Growing Categories

面向新收录速度和内容增长趋势：

- AI Agents
- Programmatic SEO
- Video Generation
- Avatar Video
- Document Q&A
- Workflow Automation

### 4. Featured Categories

面向编辑推荐与商业策略：

- Writing
- Code
- Marketing
- SEO
- Automation
- Business

### Homepage category card fields

每个 category card 应显示：

- icon
- tool count
- description
- CTA

推荐 CTA：

- `Explore category`
- `View tools`
- `See guides`

## Navigation Hierarchy

推荐导航层级如下：

### Global navigation

- Home
- Categories
- Tools
- Blog
- Collections

### Category navigation

- Home
- Primary Category
- Subcategory
- Tool

### Breadcrumb examples

#### Primary category page

- Home
- Categories
- Writing

#### Subcategory page

- Home
- Categories
- Writing
- Blog Writing

#### Tool page

- Home
- Categories
- Writing
- Blog Writing
- Tool

### Practical mapping with current schema

当前 schema 可用：

- `Category.parentId`

因此可以直接表达：

- primary category：`parentId = null`
- subcategory：`parentId = primaryCategory.id`

## Category Relationships

建议为 primary categories 建立智能 related-category graph。

### Writing

related:

- SEO
- Marketing
- Productivity
- Education

### Image

related:

- Design
- Marketing
- E-commerce
- Social Media

### Video

related:

- Audio
- Marketing
- Social Media
- Education

### Audio

related:

- Video
- Productivity
- Customer Support
- Education

### Code

related:

- Automation
- Data
- Productivity
- SEO

### Productivity

related:

- Writing
- Automation
- Research
- Business

### Marketing

related:

- SEO
- Writing
- Design
- Sales

### SEO

related:

- Writing
- Marketing
- Research
- Data

### Research

related:

- Writing
- Data
- Education
- Productivity

### Education

related:

- Writing
- Research
- Video
- Productivity

### Automation

related:

- Code
- Productivity
- Business
- Customer Support

### Business

related:

- Data
- Automation
- Sales
- Customer Support

### Design

related:

- Image
- Marketing
- Presentation Design
- Video

### Data

related:

- Research
- Code
- Business
- SEO

### Sales

related:

- Marketing
- Customer Support
- Business
- Writing

### Customer Support

related:

- Sales
- Automation
- Productivity
- Business

## URL Strategy

URL 设计原则：

- 简短
- 稳定
- 无重复前缀
- 避免同义词多版本
- 避免 keyword cannibalization

### Primary category URLs

- `/category/writing`
- `/category/image`
- `/category/video`
- `/category/audio`
- `/category/code`
- `/category/productivity`
- `/category/marketing`
- `/category/seo`
- `/category/research`
- `/category/education`
- `/category/automation`
- `/category/business`
- `/category/design`
- `/category/data`
- `/category/sales`
- `/category/customer-support`

### Subcategory URLs

当前不建议直接使用三级层级 URL。

第一阶段建议：

- `/category/blog-writing`
- `/category/copywriting`
- `/category/video-editing`
- `/category/code-review`
- `/category/keyword-research`

原因：

- 复用现有 schema 和路由成本更低
- 保持 category detail page 逻辑简单
- 更利于快速迁移当前 flat taxonomy

第二阶段如果导航和 breadcrumb 更成熟，再考虑：

- `/category/writing/blog-writing`
- `/category/code/code-review`

### URL naming rules

- primary category 用单数或抽象类名
- subcategory 用具体用户意图词
- 不重复使用 `ai-` 前缀
- 不在 slug 中混用 `tools`
- 不让一级 slug 和二级 slug 语义重复

### URL problems to avoid

- `/category/ai-writing`
- `/category/writing-tools`
- `/category/code-assistant-tools`
- `/category/video-audio`

这些都不适合作为长期 taxonomy URL。

## SEO Strategy

### SEO title formula

主类目建议公式：

- `Best {Primary Category} AI Tools`

示例：

- `Best Writing AI Tools`
- `Best Image AI Tools`
- `Best Code AI Tools`

### SEO description formula

建议：

- 说明该类目的工具类型
- 提到比较、价格、功能、替代方案
- 不堆砌关键词

示例：

- `Discover the best writing AI tools for blog posts, copywriting, email, and documentation. Compare features, pricing, and alternatives.`

### Hero intro

每个 primary category 应有：

- category definition
- user jobs-to-be-done
- what to compare

### Buying guide summary

每个 primary category 都应包含：

- 适合谁
- 主要 use cases
- 常见 pricing model
- 评估要点
- 典型替代方案

### FAQ topics

每个 primary category 应至少覆盖：

- What are the best tools in this category?
- How do I choose a tool in this category?
- Are there free tools in this category?
- Which tools are best for teams?
- What should I compare before buying?

## Editorial Recommendations

以下是每个 primary category 的 editorial foundation。

## Writing Editorial Foundation

- SEO title: `Best Writing AI Tools`
- SEO description: Compare writing AI tools for blog posts, copywriting, email, documentation, and editing.
- Hero intro: Writing tools help teams produce drafts, improve clarity, and scale content workflows faster.
- Buying guide summary: Compare output quality, brand voice control, workflow support, and SEO usefulness.
- FAQ topics:
  - best writing tools
  - free writing tools
  - writing tools for SEO
  - writing tools for teams
- Suggested collections:
  - Best AI Writing Tools
  - Free Writing AI Tools
  - Writing Tools for SEO Teams

## Image Editorial Foundation

- SEO title: `Best Image AI Tools`
- SEO description: Explore image AI tools for generation, editing, logo creation, product visuals, and portraits.
- Hero intro: Image tools support rapid concepting, asset creation, and visual production for teams and creators.
- Buying guide summary: Compare image quality, control, editing flexibility, and licensing considerations.
- FAQ topics:
  - best image generators
  - image editing tools
  - logo and brand asset tools
- Suggested collections:
  - Best AI Image Tools
  - AI Product Image Tools
  - AI Logo Design Tools

## Video Editorial Foundation

- SEO title: `Best Video AI Tools`
- SEO description: Compare AI video tools for generation, editing, avatars, and short-form production.
- Hero intro: Video tools help teams create, edit, repurpose, and publish video with less production overhead.
- Buying guide summary: Compare output speed, edit quality, avatar realism, and collaboration workflows.
- FAQ topics:
  - best AI video generators
  - best AI video editors
  - avatar video tools
- Suggested collections:
  - Best AI Video Tools
  - AI Avatar Video Tools
  - AI Short-form Editing Tools

## Audio Editorial Foundation

- SEO title: `Best Audio AI Tools`
- SEO description: Find AI audio tools for voice generation, transcription, dubbing, and audio cleanup.
- Hero intro: Audio tools streamline speech, narration, localization, and meeting-to-text workflows.
- Buying guide summary: Compare voice quality, language support, accuracy, and export flexibility.
- FAQ topics:
  - best transcription tools
  - best AI voice tools
  - dubbing and localization tools
- Suggested collections:
  - Best AI Audio Tools
  - AI Transcription Tools
  - AI Voice Generation Tools

## Code Editorial Foundation

- SEO title: `Best Code AI Tools`
- SEO description: Compare coding AI tools for code generation, review, debugging, APIs, and DevOps workflows.
- Hero intro: Code tools help engineering teams ship faster through suggestions, review, testing, and operational support.
- Buying guide summary: Compare IDE fit, code quality, security posture, review accuracy, and deployment workflows.
- FAQ topics:
  - best coding assistants
  - best code review tools
  - AI tools for debugging
- Suggested collections:
  - Best AI Coding Tools
  - AI Code Review Tools
  - AI DevOps Tools

## Productivity Editorial Foundation

- SEO title: `Best Productivity AI Tools`
- SEO description: Browse AI productivity tools for notes, meetings, tasks, and knowledge management.
- Hero intro: Productivity tools reduce manual work in planning, note capture, and internal knowledge workflows.
- Buying guide summary: Compare integration depth, organization model, summary quality, and team usability.
- FAQ topics:
  - best meeting assistants
  - best note-taking AI tools
  - best knowledge tools
- Suggested collections:
  - Best AI Productivity Tools
  - AI Meeting Assistant Tools
  - AI Knowledge Management Tools

## Marketing Editorial Foundation

- SEO title: `Best Marketing AI Tools`
- SEO description: Explore AI marketing tools for content, ad creative, landing pages, and growth workflows.
- Hero intro: Marketing tools help teams accelerate campaign creation, testing, and iteration across channels.
- Buying guide summary: Compare content quality, workflow fit, output variety, and collaboration support.
- FAQ topics:
  - best marketing AI tools
  - social media AI tools
  - landing page AI tools
- Suggested collections:
  - Best AI Marketing Tools
  - AI Social Media Tools
  - AI Landing Page Tools

## SEO Editorial Foundation

- SEO title: `Best SEO AI Tools`
- SEO description: Compare AI SEO tools for keyword research, content optimization, technical SEO, and programmatic SEO.
- Hero intro: SEO tools help teams research demand, improve pages, and scale content-led search growth.
- Buying guide summary: Compare SERP data quality, optimization workflows, technical depth, and scale support.
- FAQ topics:
  - best AI SEO tools
  - keyword research tools
  - programmatic SEO tools
- Suggested collections:
  - Best AI SEO Tools
  - AI Keyword Research Tools
  - Programmatic SEO Tools

## Research Editorial Foundation

- SEO title: `Best Research AI Tools`
- SEO description: Discover AI research tools for summarization, source comparison, and document Q&A.
- Hero intro: Research tools help users gather evidence, synthesize findings, and move through information faster.
- Buying guide summary: Compare citation trust, source transparency, summary quality, and workflow speed.
- FAQ topics:
  - best research tools
  - best PDF question-answering tools
  - source comparison tools
- Suggested collections:
  - Best AI Research Tools
  - AI Summarization Tools
  - AI Document Q&A Tools

## Education Editorial Foundation

- SEO title: `Best Education AI Tools`
- SEO description: Compare AI education tools for tutoring, quizzes, lesson planning, and student support.
- Hero intro: Education tools support teachers, students, and course builders through adaptive learning assistance.
- Buying guide summary: Compare subject fit, control, safety, age suitability, and workflow integration.
- FAQ topics:
  - best tutoring tools
  - best lesson planning tools
  - best quiz tools
- Suggested collections:
  - Best AI Education Tools
  - AI Tutoring Tools
  - AI Lesson Planning Tools

## Automation Editorial Foundation

- SEO title: `Best Automation AI Tools`
- SEO description: Explore AI automation tools for workflows, agents, triggers, and orchestration.
- Hero intro: Automation tools reduce repetitive work by linking systems, tasks, and AI actions together.
- Buying guide summary: Compare integration ecosystem, reliability, logic depth, and agent control.
- FAQ topics:
  - best workflow automation tools
  - best AI agent tools
  - no-code automation tools
- Suggested collections:
  - Best AI Automation Tools
  - AI Workflow Automation Tools
  - AI Agent Tools

## Business Editorial Foundation

- SEO title: `Best Business AI Tools`
- SEO description: Compare AI business tools for finance, HR, recruiting, legal, and operations.
- Hero intro: Business tools support back-office workflows, decision support, and team operations.
- Buying guide summary: Compare governance, workflow fit, compliance posture, and stakeholder adoption.
- FAQ topics:
  - best business AI tools
  - finance AI tools
  - HR AI tools
  - legal AI tools
- Suggested collections:
  - Best AI Business Tools
  - AI Finance Tools
  - AI HR and Recruiting Tools

## Design Editorial Foundation

- SEO title: `Best Design AI Tools`
- SEO description: Browse AI design tools for UI, branding, layout creation, and presentation design.
- Hero intro: Design tools help teams move from idea to visual system faster across product, brand, and presentation work.
- Buying guide summary: Compare creative control, export quality, collaboration model, and production speed.
- FAQ topics:
  - best design tools
  - AI UI design tools
  - AI branding tools
- Suggested collections:
  - Best AI Design Tools
  - AI UI Design Tools
  - AI Presentation Design Tools

## Data Editorial Foundation

- SEO title: `Best Data AI Tools`
- SEO description: Discover AI data tools for analysis, spreadsheets, dashboards, and business intelligence.
- Hero intro: Data tools help teams query, summarize, and explain numbers for faster operational decisions.
- Buying guide summary: Compare analysis quality, spreadsheet support, charting, and enterprise readiness.
- FAQ topics:
  - best AI data tools
  - spreadsheet AI tools
  - AI dashboard tools
- Suggested collections:
  - Best AI Data Tools
  - AI Spreadsheet Tools
  - AI Analytics Tools

## Sales Editorial Foundation

- SEO title: `Best Sales AI Tools`
- SEO description: Compare AI sales tools for prospecting, outreach, CRM workflows, and coaching.
- Hero intro: Sales tools help teams find accounts, personalize outreach, and improve pipeline execution.
- Buying guide summary: Compare enrichment quality, outreach support, coaching value, and CRM compatibility.
- FAQ topics:
  - best sales AI tools
  - prospecting tools
  - outreach tools
- Suggested collections:
  - Best AI Sales Tools
  - AI Prospecting Tools
  - AI Outreach Tools

## Customer Support Editorial Foundation

- SEO title: `Best Customer Support AI Tools`
- SEO description: Explore AI customer support tools for help centers, agent assist, and chat support automation.
- Hero intro: Support tools help teams respond faster, deflect repetitive issues, and scale service operations.
- Buying guide summary: Compare deflection quality, handoff flow, help center support, and agent augmentation.
- FAQ topics:
  - best customer support tools
  - AI help desk tools
  - support chatbot tools
- Suggested collections:
  - Best AI Customer Support Tools
  - AI Help Center Tools
  - AI Agent Assist Tools

## Internal Linking Strategy

每个 primary category page 应至少有以下内部链接模块：

### 1. Related Categories

目标：

- 横向探索
- 增加 crawl depth
- 分散 keyword intent

### 2. Related Collections

目标：

- 承接交易型和比较型搜索

示例：

- Best {Category} AI Tools
- Free {Category} AI Tools
- New {Category} AI Tools
- Trending {Category} AI Tools

### 3. Popular Tools

目标：

- 承接 click intent
- 提高 deep-linking to tool pages

### 4. Newest Tools

目标：

- 提升 freshness signals
- 给搜索引擎新内容入口

### 5. Editor's Picks

目标：

- 让分类页兼具 editorial authority

### 6. Buying Guides

目标：

- 让分类页从列表页升级为决策页

推荐 guide anchors：

- How to choose a {Category} AI tool
- Best {Category} AI tools for teams
- Free vs paid {Category} AI tools

## Validation Checklist

推荐用于 taxonomy 实施后的校验：

### Hierarchy consistency

- 每个 subcategory 只能有一个 primary parent
- primary category 不应再挂到其他 category 下
- category naming 风格一致

### No duplicate slugs

- slug 唯一
- 同义词只保留一个 canonical category

### No broken links

- 所有 navigation links、related links、collection links 可访问

### SEO validity

- category page metadata 继续有效
- breadcrumb 层级与 taxonomy 一致
- sitemap 覆盖新的 category pages
- JSON-LD 无需破坏现有结构，只需保证路径与 breadcrumb 正确

## Implementation Roadmap

建议分 5 个阶段推进。

### Phase 1 - Taxonomy freeze

- 确认 primary categories
- 确认 subcategories
- 冻结 naming rules
- 冻结 URL rules

### Phase 2 - Seed and mapping plan

- 将现有 flat categories 映射到新 taxonomy
- 为 category 设置 parent-child
- 标记 deprecated category names

### Phase 3 - Navigation integration

- 升级 homepage category module
- 升级 header / category hubs / breadcrumbs
- 增加 related-category rules

### Phase 4 - Editorial rollout

- 为每个 primary category 补 hero intro
- 补 buying guide summary
- 补 FAQ topics
- 补 collection strategy

### Phase 5 - SEO expansion

- category + collection pages
- category + guide pages
- category internal linking optimization
- category freshness strategy

## Recommended Mapping From Current To New

建议现有类目向新 taxonomy 的映射如下：

- `AI Writing` -> Primary: `Writing`
- `Image Generation` -> Subcategory under `Image`
- `Code Assistant` -> Subcategory under `Code`
- `Productivity` -> Primary: `Productivity`
- `Video & Audio` -> split into `Video` and `Audio`
- `Research` -> Primary: `Research`
- `Presentation` -> Subcategory under `Design` or `Productivity`
- `Design` -> Primary: `Design`
- `Sales` -> Primary: `Sales`
- `Marketing` -> Primary: `Marketing`
- `SEO` -> Primary: `SEO`
- `Customer Support` -> Primary: `Customer Support`
- `Education` -> Primary: `Education`
- `Finance` -> Subcategory under `Business`
- `HR` -> Subcategory under `Business`
- `Legal` -> Subcategory under `Business`
- `Data Analysis` -> Subcategory under `Data`
- `Automation` -> Primary: `Automation`
- `E-commerce` -> vertical tag or collection first, not primary category
- `Recruiting` -> Subcategory under `Business`
- `Translation` -> Subcategory under `Writing` or `Audio` depending on tool shape
- `Social Media` -> Subcategory under `Marketing`

## Final Recommendation

最推荐的落地方案是：

- 用 `Writing / Image / Video / Audio / Code / Productivity / Marketing / SEO / Research / Education / Automation / Business / Design / Data / Sales / Customer Support` 作为 primary taxonomy
- 用现有 schema 的 `parentId` 表达 subcategories
- 把 `Finance / HR / Recruiting / Legal / Social Media / Image Generation / Code Assistant / Data Analysis` 等迁移为 subcategories
- 把 `E-commerce` 优先转为 vertical collection，而不是长期 primary category
- 让 homepage、breadcrumb、internal links、editorial content 都围绕这套 taxonomy 统一

这套结构更符合：

- 专业目录站导航习惯
- 稳定的 SEO topic architecture
- 后续扩展 compare / guide / collection pages 的可持续性
