import asyncio
from datetime import datetime, timezone
from urllib.parse import urlencode

from .checkpoint import CheckpointStore
from .client import CrawlerClient, CrawlerHttpError, NotFoundError
from .config import CrawlerConfig
from .detail_parser import DetailParser
from .discovery import BASE_URL, discover_categories, has_next_page, parse_tool_urls, should_stop_pagination
from .exporter import JsonExporter
from .models import CheckpointState, CrawlerError, CrawlerReport, ExportEnvelope, ToolRecord
from .logging_utils import NULL_LOGGER, StepLogger


class FuturepediaCrawler:
    def __init__(self, config: CrawlerConfig, client: CrawlerClient, logger: StepLogger = NULL_LOGGER):
        self.config, self.client = config, client
        self.parser = DetailParser()
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
        self.integrity_check_interval = 100
        self.last_integrity_check = 0
        self.excluded_slugs: set[str] = self._load_excluded_slugs()

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

    def _load_excluded_slugs(self) -> set[str]:
        if not self.config.exclude or not self.config.exclude.exists():
            return set()
        try:
            import json
            with self.config.exclude.open("r", encoding="utf-8") as f:
                data = json.load(f)
            slugs = {item["slug"] for item in data.get("items", [])}
            self.logger.info("EXCLUDE", "加载排除列表", count=len(slugs), path=self.config.exclude)
            return slugs
        except Exception as e:
            self.logger.warning("EXCLUDE", "加载排除列表失败", path=self.config.exclude, error=str(e))
            return set()

    async def run(self) -> tuple[ExportEnvelope, CrawlerReport]:
        self.logger.info("START", "开始采集任务", mode="detail" if self.config.detailUrl else "category", 
                         maxTools=self.config.maxTools, concurrency=self.config.concurrency, batchSize=self.batch_size,
                         resume=bool(self.config.resume))
        
        if self.config.detailUrl:
            urls = [self.config.detailUrl]
            await self._crawl_batch(urls, 1)
        else:
            if self.checkpoint.pendingUrls:
                pending_count = len(self.checkpoint.pendingUrls)
                self.logger.info("RETRY", f"开始重试失败的URL", count=pending_count)
                await self._crawl_batch(self.checkpoint.pendingUrls.copy(), 0)
                self.checkpoint.pendingUrls.clear()
                self.store.save(self.checkpoint)
                self.logger.info("RETRY_DONE", "重试完成", remaining=len(self.checkpoint.pendingUrls))
            
            await self._discover_and_crawl_batched()
        
        async with self.records_lock:
            if self.records:
                await self._flush_records()
        
        self.report.completedAt = datetime.now(timezone.utc)
        self.logger.info("DONE", "采集任务完成", discovered=self.report.toolUrlsDiscovered, 
                         parsed=self.report.toolsParsed, failed=self.report.failed,
                         listPages=len(self.checkpoint.processedListPages), detailUrls=len(self.checkpoint.processedUrls))
        return ExportEnvelope(generatedAt=self.report.completedAt, total=self.report.toolsParsed, items=self.records), self.report

    async def _discover_and_crawl_batched(self) -> None:
        if self.config.categories:
            categories = self.config.categories
            self.logger.info("CATEGORY_DISCOVERY", "使用命令行指定分类", count=len(categories))
        else:
            self.logger.info("CATEGORY_DISCOVERY", "开始自动发现分类")
            response = await self.client.get_html(f"{BASE_URL}/ai-tools")
            categories = [item.slug for item in discover_categories(response.html)]
            self.logger.info("CATEGORY_DISCOVERY", "分类发现完成", count=len(categories))
        
        self.report.categoriesDiscovered = len(categories)
        
        for category in categories:
            self.logger.info("CATEGORY", "开始处理分类", category=category)
            
            start_page = self.checkpoint.categoryPages.get(category, 1)
            self.logger.info("CATEGORY_RESUME", "从断点恢复", category=category, startPage=start_page)
            
            batch_urls: list[str] = []
            previous: set[str] = set()
            consecutive_failures = 0
            
            for page in range(start_page, self.config.maxPages + 1):
                self.logger.info("PAGE", "开始获取分类分页", category=category, page=page, discovered=len(self.seen))
                
                suffix = "" if page == 1 else "?" + urlencode({"page": page})
                try:
                    response = await self.client.get_html(f"{BASE_URL}/ai-tools/{category}{suffix}")
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
                
                current = set(parse_tool_urls(response.html))
                self.report.pagesProcessed += 1
                
                for url in parse_tool_urls(response.html):
                    slug = url.rsplit("/", 1)[-1] if "/" in url else url
                    if url not in self.seen and len(self.seen) < self.config.maxTools:
                        if slug in self.excluded_slugs:
                            self.logger.debug("EXCLUDE_SKIP", "跳过已排除工具", slug=slug)
                            continue
                        self.seen.add(url)
                        batch_urls.append(url)
                
                self.checkpoint.processedListPages.append(f"{BASE_URL}/ai-tools/{category}{suffix}")
                self.checkpoint.categoryPages[category] = page + 1
                self.store.save(self.checkpoint)
                
                self.logger.info("DISCOVER", "分页链接提取完成", category=category, page=page, 
                                found=len(current), total=len(self.seen), batch=len(batch_urls),
                                listPages=len(self.checkpoint.processedListPages), detailUrls=len(self.checkpoint.processedUrls))
                
                if len(batch_urls) >= self.batch_size or should_stop_pagination(current, previous, has_next_page(response.html), 
                                                                                page, self.config.maxPages, len(self.seen), self.config.maxTools):
                    if batch_urls:
                        batch_num = (page - 1) // self.batch_size + 1
                        self.logger.info("BATCH_START", "开始采集批次", category=category, batch=batch_num, 
                                        urls=len(batch_urls), total_discovered=len(self.seen))
                        await self._crawl_batch(batch_urls, batch_num)
                        batch_urls = []
                    
                    if should_stop_pagination(current, previous, has_next_page(response.html), page, 
                                             self.config.maxPages, len(self.seen), self.config.maxTools):
                        break
                
                previous = current
            
            if batch_urls:
                batch_num = ((self.checkpoint.categoryPages.get(category, 1) - 1) // self.batch_size) + 1
                self.logger.info("BATCH_START", "开始采集剩余批次", category=category, batch=batch_num, 
                                urls=len(batch_urls), total_discovered=len(self.seen))
                await self._crawl_batch(batch_urls, batch_num)
            
            self.report.categoriesProcessed += 1
            self.report.toolUrlsDiscovered = len(self.seen)
            self.logger.info("CATEGORY_DONE", "分类处理完成", category=category, total=len(self.seen),
                            listPages=len(self.checkpoint.processedListPages), detailUrls=len(self.checkpoint.processedUrls))
            
            if len(self.seen) >= self.config.maxTools:
                self.logger.info("MAX_TOOLS_REACHED", "已达到最大工具数限制", limit=self.config.maxTools)
                break

    async def _crawl_batch(self, urls: list[str], batch_num: int) -> None:
        semaphore = asyncio.Semaphore(self.config.concurrency)
        self.logger.info("BATCH_CRAWL", "开始采集详情", batch=batch_num, urls=len(urls))
        
        async def parse_one(url: str, index: int) -> None:
            async with semaphore:
                try:
                    self.logger.info("DETAIL", "开始获取工具详情", batch=batch_num, index=f"{index}/{len(urls)}", url=url)
                    response = await self.client.get_html(url)
                    record = self.parser.parse(response.html, url, datetime.now(timezone.utc), self.config.status)
                    async with self.records_lock:
                        self.records.append(record)
                        if len(self.records) >= self.flush_interval:
                            await self._flush_records()
                    self.report.toolsParsed += 1
                    if not record.logoUrl:
                        self.report.missingLogo += 1
                    self.logger.info("DETAIL_SUCCESS", "详情解析成功", batch=batch_num, index=f"{index}/{len(urls)}", 
                                    name=record.name, slug=record.slug, 
                                    categories=len(record.metadata.sourceCategories), screenshots=len(record.metadata.screenshots))
                except Exception as error:
                    self.report.failed += 1
                    self.report.errors.append(CrawlerError(url=url, stage="detail", message=str(error), occurredAt=datetime.now(timezone.utc)))
                    self.logger.error("DETAIL_FAILED", "详情处理失败，继续下一条", batch=batch_num, index=f"{index}/{len(urls)}", 
                                     url=url, error=str(error))
                    self.checkpoint.pendingUrls.append(url)
                finally:
                    self.checkpoint.processedUrls.append(url)
                    self.store.save(self.checkpoint)
                    self.logger.debug("CHECKPOINT", "断点已保存", detailUrls=len(self.checkpoint.processedUrls), 
                                     listPages=len(self.checkpoint.processedListPages), pending=len(self.checkpoint.pendingUrls), path=self.config.checkpoint)
        
        await asyncio.gather(*(parse_one(url, index) for index, url in enumerate(urls, 1)))
        
        async with self.records_lock:
            if self.records:
                await self._flush_records()
        
        self.logger.info("BATCH_DONE", "批次采集完成", batch=batch_num, urls=len(urls))

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
        if self.checkpoint.savedCount - self.last_integrity_check >= self.integrity_check_interval:
            await self._verify_integrity()

    async def _verify_integrity(self) -> None:
        """完整性校验：比对 checkpoint.savedCount 与 JSON 文件实际记录数，检测数据丢失"""
        self.last_integrity_check = self.checkpoint.savedCount
        try:
            import json
            if not self.config.output.exists():
                self.logger.warning("INTEGRITY", "完整性检查：输出文件不存在", path=self.config.output)
                return
            with self.config.output.open("r", encoding="utf-8") as f:
                data = json.load(f)
            file_count = len(data.get("items", []))
            saved_count = self.checkpoint.savedCount
            processed_count = len(self.checkpoint.processedUrls)
            parsed_count = self.report.toolsParsed
            if file_count == saved_count:
                self.logger.info("INTEGRITY", "完整性检查通过", fileItems=file_count, savedCount=saved_count, processedUrls=processed_count, parsed=parsed_count)
            else:
                gap = saved_count - file_count
                self.logger.error("INTEGRITY", "完整性检查异常：数据不一致", fileItems=file_count, savedCount=saved_count, gap=gap, processedUrls=processed_count, parsed=parsed_count)
                if file_count < saved_count and file_count > 0:
                    self.checkpoint.savedCount = file_count
                    self.store.save(self.checkpoint)
                    self.logger.warning("INTEGRITY", "已修正 savedCount 为文件实际记录数", correctedTo=file_count)
        except Exception as e:
            self.logger.error("INTEGRITY", "完整性检查失败", error=str(e))