# Futurepedia 独立 Python 采集器设计

## 目标与范围

在现有 `ai-tool-cms` 仓库中新增一套可独立运行、可测试、适合生产调度的 Futurepedia Python 采集器。本阶段只负责网页采集、字段清洗、断点恢复、JSON 导出和 dry-run，不修改现有 TypeScript、Prisma、API、Worker 或 Admin 实现，也不直接写入数据库。

采集入口为 `https://www.futurepedia.io/ai-tools`，支持自动发现分类、分类分页、单详情页调试和限定数量采集。采集行为必须尊重 `robots.txt`、网站条款和合理速率限制，不绕过登录、验证码或明确访问限制。

## 代码结构

入口脚本为 `scripts/crawlers/futurepedia_crawler.py`，业务模块位于 `scripts/crawlers/futurepedia/`：

- `cli.py`：命令行参数、信号处理和任务编排。
- `config.py`：运行配置和默认值。
- `models.py`：导出记录、来源分类、checkpoint、错误和报告模型。
- `client.py`：异步 HTTP 请求、重试、退避、限速、Cookie、Proxy 和响应校验。
- `discovery.py`：分类发现、分页遍历、终止条件和详情 URL 去重。
- `detail_parser.py`：详情字段解析和结构化数据回退。
- `cleaners.py`：URL、slug、纯文本、SEO 字段及安全 HTML 清洗。
- `selectors.py`：集中管理多个容错选择器。
- `checkpoint.py`：原子保存和恢复断点。
- `exporter.py`：导出 `tools.json`、`errors.json` 和 `report.json`。

依赖记录在 `scripts/crawlers/requirements-futurepedia.txt`。核心依赖为 `httpx`、`beautifulsoup4`、`lxml`、`pydantic`、`python-slugify`、`rich` 和 `pytest`；Playwright 只保留显式 `--browser` 扩展入口，不作为默认请求路径。

## 采集流程

1. 启动时读取配置、robots 规则及可选 checkpoint。
2. 如果提供 `--detail-url`，仅采集该详情页。
3. 如果提供一个或多个 `--category`，只遍历指定分类；否则从入口页发现所有合法 `/ai-tools/{slug}` 链接。
4. 分类列表从第一页开始，以 `?page=N` 翻页，收集 `/tool/{slug}` 链接。
5. 遇到无下一页、无新链接、空列表、404、与上一页完全重复、`maxPages` 或 `maxTools` 时停止分页。
6. 以低并发获取详情页，单页失败只写入错误记录，不终止任务。
7. 解析、清洗、模型校验并按来源 URL、来源 slug、slug 和规范化官网域名进行本次任务内去重。
8. 每完成一条详情记录即更新 checkpoint；SIGINT 时安全保存当前状态。
9. 原子写出数据、错误、checkpoint 和统计报告。

## 请求可靠性

默认超时 30 秒、重试 3 次、并发 2、随机间隔 1.5 至 4 秒。客户端对 429 使用 `Retry-After` 或指数退避；对 5xx 和网络异常重试；404 直接跳过；403 记录访问限制并停止反复请求该 URL。响应必须是成功状态且包含合理 HTML 内容。

CLI 支持 User-Agent、Cookie、HTTP/HTTPS Proxy 配置。普通 HTTP 获取到空页面或保护页时，不自动规避限制；只有用户显式传入 `--browser` 才允许调用可选浏览器回退，并继续遵守 robots 和访问限制。

## 字段解析与清洗

每个字段使用多个语义选择器，并在适用时回退到 Open Graph、meta 或 JSON-LD：

- `name`：`h1`、Open Graph title、页面 title、URL slug。
- `slug`：来源详情 URL slug，经小写、字符白名单和连字符规范化。
- `website`：Visit Site 链接，必须为非 Futurepedia 的合法 HTTP(S) URL，并删除指定跟踪参数。
- `summary`：页面摘要或正文首段，纯文本，不超过 120 字符且不截断单词。
- `description`：What is 标题后的首段、摘要、Open Graph description 或 meta description，保持纯文本。
- `longDescription`：正文区域的清理 HTML，只保留 `h2`、`h3`、`p`、`ul`、`ol`、`li`、`strong` 和 `a`，过滤危险标签、事件属性、跟踪属性及无关页面区块，并将相对链接转为绝对链接。
- `logoUrl`：名称 Logo alt、详情顶部方形图或结构化图片，优先高质量 `srcset`。
- `metadata.screenshots`：排除 Logo 后的主展示大图，优先宽度不少于 640 的候选图。
- `metadata.sourceCategories` 和 `tags`：由 AI Categories 区域的 `/ai-tools/{slug}` 链接提取。
- `pricingModel`：规范化为当前项目可表达的 `Free`、`Freemium`、`Paid` 或 `Contact`；无法表达的原始值保留在 metadata，导出值使用 `Unknown`。
- SEO：依据真实摘要与描述生成英文 `metaTitle` 和 `metaDescription`，遵守长度限制且不虚构功能。

本阶段不执行本地数据库分类匹配，但保留完整来源分类，以供后续导入器使用。CLI 中出现 `--import-db` 时必须明确拒绝并返回非零退出码，防止误写数据库。

## 输出与恢复

默认输出目录为 `storage/crawler/futurepedia/`：

- `tools.json`：包含 `source`、`generatedAt`、`total` 和 `items` 的固定 envelope。
- `errors.json`：逐页、逐详情错误记录。
- `checkpoint.json`：已处理 URL、待处理 URL、分类分页状态及累计结果位置。
- `report.json`：分类、页面、发现、解析、跳过、失败、重复和缺失字段统计。

导出记录固定包含 `name`、`slug`、`website`、`summary`、`description`、`longDescription`、`logoUrl`、`pricingModel`、`status`、`metaTitle`、`metaDescription`、`publishedAt`、`scheduledAt` 和 `metadata`。默认状态使用项目真实枚举语义对应的 `PUBLISHED`；`--status draft` 输出 `DRAFT` 且 `publishedAt` 为 null。

所有 JSON 写入使用临时文件加原子替换，Pydantic 模型保证内容可序列化。`--dry-run` 表示不执行数据库或资产写入，但仍生成指定 JSON、checkpoint 和报告，便于验收。

## CLI 接口

支持：`--category`（可重复）、`--detail-url`、`--max-tools`、`--max-pages`、`--concurrency`、`--delay-min`、`--delay-max`、`--timeout`、`--retries`、`--output`、`--checkpoint`、`--resume`、`--dry-run`、`--import-db`、`--strategy`、`--status`、`--download-assets`、`--browser`、`--headless`、`--overwrite-existing` 和 `--overwrite-empty-only`。

`--strategy` 和覆盖参数只进入导出配置及报告，供后续数据库导入阶段消费；本阶段不会据此写库。`--download-assets` 在本阶段实现安全下载到 `storage/logos/{slug}.{ext}` 和 `storage/screenshots/{slug}/cover.{ext}`，使用不覆盖已有文件的策略。

## 测试与验收

离线测试位于 `tests/crawlers/futurepedia/`，fixture 位于 `tests/fixtures/futurepedia/`。测试不访问实时外网，覆盖：

- 分类和详情 URL 识别、分类去重及分页停止条件。
- 名称、官网、Logo、截图、摘要、描述、正文、分类和收费模式解析。
- 跟踪参数清除、slug 标准化、HTML 允许列表清洗和 SEO 字段长度。
- JSON envelope/记录模型校验、checkpoint 恢复和 dry-run 不触发写库。
- 请求状态处理和失败隔离。

验收依次运行 Python compileall、完整 pytest、Coralflavor 单详情 dry-run、writing-generators 最多 5 条 dry-run，并校验导出字段。联网验收若受到网络、robots 或站点访问限制，报告实际响应和未完成项，不伪造结果。

## 已知边界

- 本阶段不实现数据库导入、后台任务、Worker、API 或 Admin 页面。
- Futurepedia 页面结构变化可能需要更新集中选择器；多选择器和结构化数据回退用于降低单一 DOM 变化的影响。
- 浏览器回退依赖额外安装 Playwright 及浏览器运行时，默认关闭。
- 资产下载仅保存本地文件和导出 URL，不接入项目对象存储。
