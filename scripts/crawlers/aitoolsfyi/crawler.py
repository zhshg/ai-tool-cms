import asyncio
from datetime import datetime, timezone
from urllib.parse import urlencode

from .card_parser import CardParser
from .checkpoint import CheckpointStore
from .client import CrawlerClient, CrawlerHttpError, NotFoundError
from .config import CrawlerConfig
from .discovery import BASE_URL, ZH_BASE_URL, discover_categories, has_next_page, parse_tool_cards, should_stop_pagination
from .exporter import JsonExporter
from .logging_utils import NULL_LOGGER, StepLogger
from .models import CheckpointState, CrawlerError, CrawlerReport, ExportEnvelope, ToolRecord


class AitoolsfyiCrawler:
    def __init__(self, config: CrawlerConfig, client: CrawlerClient, logger: StepLogger = NULL_LOGGER):
        self.config, self.client = config, client
        self.parser = CardParser()
        self.store = CheckpointStore(config.checkpoint)
        self.checkpoint = self.store.load() if config.resume else CheckpointState()
        self.report = CrawlerReport(startedAt=datetime.now(timezone.utc))
        self.logger = logger
        self.exporter = JsonExporter(config.output)
        self.records_lock = asyncio.Lock()
        self.records: list[ToolRecord] = []
        self.flush_interval = 50
        self.seen: set[str] = self._init_seen()
        self.batch_size = 5

    def _init_seen(self) -> set[str]:
        if not self.config.resume:
            return set()
        seen = set(self.checkpoint.processedUrls)
        if self.checkpoint.pendingUrls:
            seen.update(self.checkpoint.pendingUrls)
            self.logger.info("RESUME", "从断点恢复已处理URL", processed=len(self.checkpoint.processedUrls), pending=len(self.checkpoint.pendingUrls), total=len(seen))
        else:
            self.logger.info("RESUME", "从断点恢复已处理URL", processed=len(self.checkpoint.processedUrls), total=len(seen))
        return seen

    async def run(self) -> tuple[ExportEnvelope, CrawlerReport]:
        self.logger.info("START", "开始采集任务", maxTools=self.config.maxTools, concurrency=self.config.concurrency, batchSize=self.batch_size, resume=bool(self.config.resume))

        if self.checkpoint.pendingUrls:
            # 重试失败的卡片
            pending_count = len(self.checkpoint.pendingUrls)
            self.logger.info("RETRY", "开始重试失败的卡片数据", count=pending_count)
            # 对于 aitools.fyi，pendingUrls 存储的是工具名称，需要重新获取
            self.checkpoint.pendingUrls.clear()
            self.store.save(self.checkpoint)

        await self._discover_and_crawl_batched()

        async with self.records_lock:
            if self.records:
                await self._flush_records()

        self.report.completedAt = datetime.now(timezone.utc)
        self.logger.info("DONE", "采集任务完成", discovered=self.report.toolUrlsDiscovered, parsed=self.report.toolsParsed, failed=self.report.failed, listPages=len(self.checkpoint.processedListPages))
        return ExportEnvelope(generatedAt=self.report.completedAt, total=self.report.toolsParsed, items=self.records), self.report

    async def _discover_and_crawl_batched(self) -> None:
        if self.config.categories:
            categories = self.config.categories
            self.logger.info("CATEGORY_DISCOVERY", "使用命令行指定分类", count=len(categories))
        else:
            self.logger.info("CATEGORY_DISCOVERY", "开始自动发现分类")
            response = await self.client.get_html(f"{ZH_BASE_URL}/category")
            categories = [item.slug for item in discover_categories(response.html)]
            self.logger.info("CATEGORY_DISCOVERY", "分类发现完成", count=len(categories))

        self.report.categoriesDiscovered = len(categories)

        for category in categories:
            self.logger.info("CATEGORY", "开始处理分类", category=category)

            start_page = self.checkpoint.categoryPages.get(category, 1)
            self.logger.info("CATEGORY_RESUME", "从断点恢复", category=category, startPage=start_page)

            batch_cards: list[dict] = []
            previous: list[dict] = []
            consecutive_failures = 0

            for page in range(start_page, self.config.maxPages + 1):
                self.logger.info("PAGE", "开始获取分类分页", category=category, page=page, discovered=len(self.seen))

                suffix = "" if page == 1 else "?" + urlencode({"page": page})
                try:
                    response = await self.client.get_html(f"{ZH_BASE_URL}/category/{category}{suffix}")
                    consecutive_failures = 0
                except NotFoundError:
                    self.logger.info("PAGE_NOT_FOUND", "分页不存在，结束该分类", category=category, page=page)
                    break
                except CrawlerHttpError as e:
                    consecutive_failures += 1
                    self.logger.warning("PAGE_FAILED", "分页获取失败", category=category, page=page, error=str(e), failures=consecutive_failures)
                    self.report.failed += 1
                    if consecutive_failures >= 5:
                        self.logger.warning("CATEGORY_SKIP", "连续失败5次，跳过该分类", category=category)
                        break
                    continue

                current_cards = parse_tool_cards(response.html)
                self.report.pagesProcessed += 1

                # 过滤已处理的工具
                new_cards = []
                for card in current_cards:
                    website = card["website"]
                    if website not in self.seen and len(self.seen) < self.config.maxTools:
                        self.seen.add(website)
                        new_cards.append(card)
                        batch_cards.append(card)

                self.checkpoint.processedListPages.append(f"{ZH_BASE_URL}/category/{category}{suffix}")
                self.checkpoint.categoryPages[category] = page + 1
                self.store.save(self.checkpoint)

                self.logger.info("DISCOVER", "分页卡片提取完成", category=category, page=page, found=len(current_cards), new=len(new_cards), total=len(self.seen), batch=len(batch_cards))

                # 批量处理
                if len(batch_cards) >= self.batch_size or should_stop_pagination(current_cards, previous, has_next_page(response.html), page, self.config.maxPages, len(self.seen), self.config.maxTools):
                    if batch_cards:
                        batch_num = (page - 1) // self.batch_size + 1
                        self.logger.info("BATCH_START", "开始处理批次", category=category, batch=batch_num, cards=len(batch_cards), total_discovered=len(self.seen))
                        await self._process_batch(batch_cards, batch_num)
                        batch_cards = []

                    if should_stop_pagination(current_cards, previous, has_next_page(response.html), page, self.config.maxPages, len(self.seen), self.config.maxTools):
                        break

                previous = current_cards

            if batch_cards:
                batch_num = ((self.checkpoint.categoryPages.get(category, 1) - 1) // self.batch_size) + 1
                self.logger.info("BATCH_START", "开始处理剩余批次", category=category, batch=batch_num, cards=len(batch_cards), total_discovered=len(self.seen))
                await self._process_batch(batch_cards, batch_num)

            self.report.categoriesProcessed += 1
            self.report.toolUrlsDiscovered = len(self.seen)
            self.logger.info("CATEGORY_DONE", "分类处理完成", category=category, total=len(self.seen))

            if len(self.seen) >= self.config.maxTools:
                self.logger.info("MAX_TOOLS_REACHED", "已达到最大工具数限制", limit=self.config.maxTools)
                break

    async def _process_batch(self, cards: list[dict], batch_num: int) -> None:
        """批量处理工具卡片"""
        self.logger.info("BATCH_PROCESS", "开始处理工具卡片", batch=batch_num, cards=len(cards))

        for card in cards:
            try:
                website = card["website"]
                self.logger.info("CARD", "处理工具卡片", batch=batch_num, name=card["name"], website=website)

                record = self.parser.parse(card, datetime.now(timezone.utc), self.config.status)
                async with self.records_lock:
                    self.records.append(record)
                    if len(self.records) >= self.flush_interval:
                        await self._flush_records()

                self.report.toolsParsed += 1
                if not record.logoUrl:
                    self.report.missingLogo += 1

                self.logger.info("CARD_SUCCESS", "卡片处理成功", batch=batch_num, name=record.name, slug=record.slug, categories=len(record.metadata.sourceCategories))
            except Exception as error:
                self.report.failed += 1
                self.report.errors.append(CrawlerError(url=card.get("website", "unknown"), stage="card", message=str(error), occurredAt=datetime.now(timezone.utc)))
                self.logger.error("CARD_FAILED", "卡片处理失败", batch=batch_num, name=card.get("name", "unknown"), error=str(error))

        async with self.records_lock:
            if self.records:
                await self._flush_records()

        self.logger.info("BATCH_DONE", "批次处理完成", batch=batch_num, cards=len(cards))

    async def _flush_records(self) -> None:
        to_save = self.records[:]
        self.records.clear()
        start_index = self.checkpoint.savedCount
        total = start_index + len(to_save)
        records_dicts = [r.model_dump(mode="json") for r in to_save]
        self.exporter.append_tools(records_dicts, start_index, total)
        self.checkpoint.savedCount = total
        self.store.save(self.checkpoint)
        self.logger.info("FLUSH", "增量写入完成", count=len(to_save), saved=total, path=self.config.output)