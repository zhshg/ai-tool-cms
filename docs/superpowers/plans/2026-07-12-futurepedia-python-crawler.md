# Futurepedia Python Crawler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个独立、可恢复、可离线测试并能导出生产可用 JSON 的 Futurepedia Python 采集器。

**Architecture:** 薄 CLI 负责参数和编排，异步客户端负责合规请求，发现器负责分类与分页，解析器和清洗器负责纯函数转换，Pydantic 模型定义稳定导出契约，checkpoint 与 exporter 使用原子文件替换。数据库写入明确不在本阶段范围内。

**Tech Stack:** Python 3.11+、httpx、BeautifulSoup4、lxml、Pydantic 2、python-slugify、Rich、pytest、pytest-asyncio。

## Global Constraints

- 不修改现有 TypeScript、Prisma、API、Worker、Admin 或现有未提交文件。
- 默认 timeout 30 秒、retries 3、delay 1.5–4 秒、concurrency 2。
- 不绕过登录、验证码、robots.txt 或明确访问限制。
- 单元测试不得访问实时外网。
- 所有新增或修改的代码注释使用中文；标识符保持英文。
- `--import-db` 必须拒绝执行并返回非零退出码。
- JSON 和 checkpoint 必须使用原子写入；dry-run 不写数据库。

---

### Task 1: 配置、模型与 CLI 契约

**Files:**
- Create: `scripts/crawlers/futurepedia/__init__.py`
- Create: `scripts/crawlers/futurepedia/config.py`
- Create: `scripts/crawlers/futurepedia/models.py`
- Create: `scripts/crawlers/futurepedia/cli.py`
- Create: `scripts/crawlers/futurepedia_crawler.py`
- Create: `scripts/crawlers/requirements-futurepedia.txt`
- Test: `tests/crawlers/futurepedia/test_config_models_cli.py`

**Interfaces:**
- Produces: `CrawlerConfig`, `SourceCategory`, `SourceMetadata`, `ToolRecord`, `CrawlerError`, `CrawlerReport`, `CheckpointState`, `build_parser()`, `main(argv: Sequence[str] | None) -> int`。

- [ ] **Step 1: 写失败测试**

```python
def test_tool_record_contains_required_export_fields():
    record = make_valid_record()
    assert set(record.model_dump(mode="json")) == REQUIRED_FIELDS

def test_import_db_is_rejected():
    assert main(["--import-db"]) == 2
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_config_models_cli.py -v`
Expected: FAIL，因为模块和类型尚不存在。

- [ ] **Step 3: 实现最小模型与参数解析**

```python
class ToolRecord(BaseModel):
    name: str
    slug: str
    website: HttpUrl
    summary: str
    description: str
    longDescription: str
    logoUrl: HttpUrl | None = None
    pricingModel: str
    status: Literal["PUBLISHED", "DRAFT"]
    metaTitle: str
    metaDescription: str
    publishedAt: datetime | None
    scheduledAt: datetime | None = None
    metadata: SourceMetadata
```

入口脚本只负责将仓库根目录加入 `sys.path` 并调用 `futurepedia.cli.main()`。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_config_models_cli.py -v`
Expected: PASS。

### Task 2: URL、slug、文本、SEO 与 HTML 清洗

**Files:**
- Create: `scripts/crawlers/futurepedia/cleaners.py`
- Test: `tests/crawlers/futurepedia/test_cleaners.py`

**Interfaces:**
- Produces: `clean_website_url()`, `normalize_slug()`, `clean_text()`, `truncate_words()`, `sanitize_html()`, `build_meta_title()`, `build_meta_description()`, `canonical_domain()`。

- [ ] **Step 1: 写失败测试**

```python
def test_clean_website_url_removes_tracking_but_keeps_business_query():
    raw = "https://example.com/app?id=7&utm_source=futurepedia&ref=fp"
    assert clean_website_url(raw) == "https://example.com/app?id=7"

def test_sanitize_html_uses_allowlist_and_absolutizes_links():
    raw = '<script>x()</script><h2 onclick="x()">Title</h2><p>Body <a href="/docs">Docs</a></p>'
    assert sanitize_html(raw, "https://www.futurepedia.io/tool/x") == '<h2>Title</h2><p>Body <a href="https://www.futurepedia.io/docs">Docs</a></p>'
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_cleaners.py -v`
Expected: FAIL，清洗函数不存在。

- [ ] **Step 3: 实现允许列表清洗与长度规则**

```python
TRACKING_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "referrer", "source", "via"}
ALLOWED_TAGS = {"h2", "h3", "p", "ul", "ol", "li", "strong", "a"}
ALLOWED_ATTRS = {"a": {"href"}}
```

官网必须是 HTTP(S)、host 非空且不是 `futurepedia.io`；SEO 截断只能在单词边界发生。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_cleaners.py -v`
Expected: PASS。

### Task 3: 分类、列表与分页发现

**Files:**
- Create: `scripts/crawlers/futurepedia/selectors.py`
- Create: `scripts/crawlers/futurepedia/discovery.py`
- Create: `tests/fixtures/futurepedia/categories.html`
- Create: `tests/fixtures/futurepedia/list-page-1.html`
- Create: `tests/fixtures/futurepedia/list-page-repeat.html`
- Test: `tests/crawlers/futurepedia/test_discovery.py`

**Interfaces:**
- Produces: `is_category_url()`, `is_detail_url()`, `discover_categories()`, `parse_tool_urls()`, `should_stop_pagination()`。

- [ ] **Step 1: 写失败测试**

```python
def test_discovers_only_category_links():
    categories = discover_categories(load_fixture("categories.html"), BASE_URL)
    assert [item.slug for item in categories] == ["productivity", "writing-generators"]

def test_stops_when_current_urls_equal_previous_urls():
    assert should_stop_pagination({"a", "b"}, {"a", "b"}, has_next=True)
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_discovery.py -v`
Expected: FAIL，发现模块不存在。

- [ ] **Step 3: 实现 URL 识别、去重及七类停止条件**

```python
CATEGORY_PATH = re.compile(r"^/ai-tools/([a-z0-9-]+)/?$")
DETAIL_PATH = re.compile(r"^/tool/([a-z0-9-]+)/?$")
```

排除入口自身、非 Futurepedia host、查询噪声和非目标路径；保留发现顺序。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_discovery.py -v`
Expected: PASS。

### Task 4: 详情页解析

**Files:**
- Create: `scripts/crawlers/futurepedia/detail_parser.py`
- Create: `tests/fixtures/futurepedia/coralflavor.html`
- Test: `tests/crawlers/futurepedia/test_detail_parser.py`

**Interfaces:**
- Consumes: Task 1 模型、Task 2 清洗器、Task 3 URL 识别。
- Produces: `DetailParser.parse(html: str, source_url: str, crawled_at: datetime, status: str) -> ToolRecord`。

- [ ] **Step 1: 写失败测试**

```python
def test_parses_coralflavor_fixture():
    record = parser.parse(load_fixture("coralflavor.html"), CORAL_URL, NOW, "PUBLISHED")
    assert record.name == "Coralflavor"
    assert str(record.website) == "https://coralflavor.com/"
    assert record.metadata.sourceCategories[0].slug == "chatbots"
    assert record.metadata.screenshots
    assert "<script" not in record.longDescription
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_detail_parser.py -v`
Expected: FAIL，解析器不存在。

- [ ] **Step 3: 实现多选择器与 JSON-LD/Open Graph 回退**

```python
NAME_SELECTORS = ("h1", '[itemprop="name"]')
SUMMARY_SELECTORS = ("p.my-2", "main h1 + p", '[data-testid="tool-summary"]')
CONTENT_SELECTORS = ("main article", '[data-testid="tool-content"]', "main")
```

解析官网 Visit Site、最高合理 `srcset`、Logo/截图区分、AI Categories、Pricing Model，并生成 metadata 与 SEO 字段。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_detail_parser.py -v`
Expected: PASS。

### Task 5: 异步客户端与 robots 合规

**Files:**
- Create: `scripts/crawlers/futurepedia/client.py`
- Test: `tests/crawlers/futurepedia/test_client.py`

**Interfaces:**
- Produces: `CrawlerClient`, `FetchResult`, `AccessDeniedError`, `NotFoundError`, `RobotsDeniedError`。

- [ ] **Step 1: 写失败测试**

```python
@pytest.mark.asyncio
async def test_retries_500_then_returns_html():
    transport = sequence_transport([500, 503, 200], body="<html>ok</html>")
    async with CrawlerClient(config, transport=transport, sleep=no_sleep) as client:
        result = await client.get_html("https://www.futurepedia.io/tool/x")
    assert result.status == 200
    assert transport.calls == 3
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_client.py -v`
Expected: FAIL，客户端不存在。

- [ ] **Step 3: 实现状态策略、退避、随机延迟与 robots 检查**

```python
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
```

支持注入 transport、sleep 和随机源，使测试无需网络和真实等待；403 不重试，404 抛出专用跳过异常。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_client.py -v`
Expected: PASS。

### Task 6: Checkpoint、导出、资产下载与原子写入

**Files:**
- Create: `scripts/crawlers/futurepedia/checkpoint.py`
- Create: `scripts/crawlers/futurepedia/exporter.py`
- Test: `tests/crawlers/futurepedia/test_checkpoint_exporter.py`

**Interfaces:**
- Produces: `CheckpointStore.load()`, `CheckpointStore.save()`, `JsonExporter.export_tools()`, `export_errors()`, `export_report()`, `download_asset()`。

- [ ] **Step 1: 写失败测试**

```python
def test_checkpoint_round_trip(tmp_path):
    store = CheckpointStore(tmp_path / "checkpoint.json")
    store.save(CheckpointState(processedUrls=["https://x/tool/a"]))
    assert store.load().processedUrls == ["https://x/tool/a"]

def test_asset_download_never_overwrites(tmp_path):
    target = tmp_path / "logo.png"
    target.write_bytes(b"manual")
    assert download_asset_bytes(target, b"crawler") is False
    assert target.read_bytes() == b"manual"
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_checkpoint_exporter.py -v`
Expected: FAIL，存储模块不存在。

- [ ] **Step 3: 实现同目录临时文件、flush、fsync、replace**

```python
def atomic_write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    # json.dump -> flush -> os.fsync -> os.replace
```

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_checkpoint_exporter.py -v`
Expected: PASS。

### Task 7: 采集任务编排、失败隔离与安全中断

**Files:**
- Create: `scripts/crawlers/futurepedia/crawler.py`
- Modify: `scripts/crawlers/futurepedia/cli.py`
- Test: `tests/crawlers/futurepedia/test_crawler.py`

**Interfaces:**
- Produces: `FuturepediaCrawler.run() -> CrawlResult`，CLI 将结果导出并返回稳定退出码。

- [ ] **Step 1: 写失败测试**

```python
@pytest.mark.asyncio
async def test_detail_failure_does_not_abort_remaining_items(tmp_path):
    crawler = make_crawler(responses={"a": RuntimeError("bad"), "b": VALID_HTML})
    result = await crawler.run()
    assert result.report.toolsParsed == 1
    assert result.report.failed == 1

@pytest.mark.asyncio
async def test_resume_skips_processed_urls(tmp_path):
    crawler = make_crawler(checkpoint=CheckpointState(processedUrls=[URL_A]))
    await crawler.run()
    assert URL_A not in crawler.client.requested_urls
```

- [ ] **Step 2: 验证 RED**

Run: `pytest tests/crawlers/futurepedia/test_crawler.py -v`
Expected: FAIL，编排器不存在。

- [ ] **Step 3: 实现分类模式、详情模式、Semaphore、checkpoint 和 SIGINT**

编排器维护稳定发现顺序，限制总数，逐条捕获异常并更新报告；CLI 用 `asyncio.run()` 执行，SIGINT 设置取消事件并在退出前保存 checkpoint。

- [ ] **Step 4: 验证 GREEN**

Run: `pytest tests/crawlers/futurepedia/test_crawler.py -v`
Expected: PASS。

### Task 8: 离线完整验证与使用文档

**Files:**
- Create: `scripts/crawlers/futurepedia/README.md`
- Modify: `tests/crawlers/futurepedia/*`（仅修正测试发现的真实缺陷）

**Interfaces:**
- Consumes: 全部前置任务。
- Produces: 可复制的安装、单页、分类、resume、资产下载和输出说明。

- [ ] **Step 1: 运行静态编译**

Run: `python -m compileall scripts/crawlers`
Expected: exit 0，无 SyntaxError。

- [ ] **Step 2: 运行完整离线测试**

Run: `pytest tests/crawlers/futurepedia -v`
Expected: 全部 PASS。

- [ ] **Step 3: 验证 CLI 帮助与写库拒绝**

Run: `python scripts/crawlers/futurepedia_crawler.py --help`
Expected: exit 0，列出设计中的全部参数。

Run: `python scripts/crawlers/futurepedia_crawler.py --import-db`
Expected: exit 2，明确说明本阶段不支持数据库导入。

### Task 9: 受控联网验收

**Files:**
- Generated: `storage/crawler/futurepedia/tools.json`
- Generated: `storage/crawler/futurepedia/errors.json`
- Generated: `storage/crawler/futurepedia/checkpoint.json`
- Generated: `storage/crawler/futurepedia/report.json`

**Interfaces:**
- Consumes: 完整 CLI。
- Produces: 实时验收证据或访问限制的准确报告。

- [ ] **Step 1: Coralflavor 单详情 dry-run**

Run: `python scripts/crawlers/futurepedia_crawler.py --detail-url https://www.futurepedia.io/tool/coralflavor --dry-run`
Expected: exit 0，或在 robots/403/网络限制时返回有说明的非零状态并写入错误报告。

- [ ] **Step 2: writing-generators 最多 5 条 dry-run**

Run: `python scripts/crawlers/futurepedia_crawler.py --category writing-generators --max-tools 5 --dry-run`
Expected: `total <= 5`，单条失败不终止其他详情。

- [ ] **Step 3: 校验 JSON 字段**

Run: `python -m json.tool storage/crawler/futurepedia/tools.json`
Expected: exit 0；每条记录通过 `ToolRecord.model_validate()`。

- [ ] **Step 4: 最终回归**

Run: `python -m compileall scripts/crawlers`
Expected: exit 0。

Run: `pytest tests/crawlers/futurepedia -v`
Expected: 全部 PASS。
