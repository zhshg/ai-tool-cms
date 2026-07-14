import argparse
import asyncio
from collections.abc import Sequence
from pathlib import Path

from rich.console import Console

from .client import CrawlerClient
from .config import CrawlerConfig
from .crawler import FuturepediaCrawler
from .exporter import JsonExporter
from .logging_utils import StepLogger


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Futurepedia 生产级独立采集器")
    parser.add_argument("--category", action="append", default=[])
    parser.add_argument("--detail-url")
    parser.add_argument("--max-tools", type=int, default=15000)
    parser.add_argument("--max-pages", type=int, default=200)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--delay-min", type=float, default=1.5)
    parser.add_argument("--delay-max", type=float, default=4.0)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--output", type=Path, default=Path("storage/crawler/futurepedia/tools.json"))
    parser.add_argument("--checkpoint", type=Path, default=Path("storage/crawler/futurepedia/checkpoint.json"))
    parser.add_argument("--exclude", type=Path, help="排除已存在工具的JSON文件路径")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--import-db", action="store_true")
    parser.add_argument("--strategy", choices=("skip", "update", "upsert"), default="upsert")
    parser.add_argument("--status", choices=("published", "draft"), default="published")
    parser.add_argument("--download-assets", action="store_true")
    parser.add_argument("--browser", action="store_true")
    parser.add_argument("--headless", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--overwrite-existing", action="store_true")
    parser.add_argument("--overwrite-empty-only", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--user-agent")
    parser.add_argument("--cookie")
    parser.add_argument("--proxy")
    parser.add_argument("--log-level", choices=("debug", "info", "warning", "error"), default="info")
    parser.add_argument("--log-file", type=Path, default=Path("storage/crawler/futurepedia/crawler.log"))
    parser.add_argument("--console-log", action=argparse.BooleanOptionalAction, default=True)
    return parser


async def run(args: argparse.Namespace) -> int:
    logger = StepLogger(level=args.log_level, log_file=args.log_file, console=args.console_log)
    logger.info("BOOT", "启动 Futurepedia 采集器")
    config = CrawlerConfig(
        categories=args.category, detailUrl=args.detail_url, maxTools=args.max_tools, maxPages=args.max_pages,
        concurrency=args.concurrency, delayMin=args.delay_min, delayMax=args.delay_max, timeout=args.timeout,
        retries=args.retries, output=args.output, checkpoint=args.checkpoint, exclude=args.exclude,
        resume=args.resume, dryRun=args.dry_run,
        status="PUBLISHED" if args.status == "published" else "DRAFT", downloadAssets=args.download_assets,
        browser=args.browser, headless=args.headless, userAgent=args.user_agent or CrawlerConfig().userAgent,
        cookie=args.cookie, proxy=args.proxy,
    )
    logger.info("CONFIG", "运行参数已加载", maxTools=config.maxTools, maxPages=config.maxPages, concurrency=config.concurrency, dryRun=config.dryRun, output=config.output)
    async with CrawlerClient(config, logger=logger) as client:
        envelope, report = await FuturepediaCrawler(config, client, logger).run()
    exporter = JsonExporter(config.output)
    logger.info("EXPORT", "开始写入错误和报告", output=config.output)
    exporter.export_errors(report.errors); exporter.export_report(report)
    logger.info("EXPORT", "导出完成", tools=envelope.total, errors=len(report.errors), directory=config.output.parent)
    logger.info("DONE", "全部步骤执行完成", parsed=report.toolsParsed, failed=report.failed, output=config.output)
    logger.close()
    return 0 if report.toolsParsed or not report.failed else 1


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.import_db:
        Console(stderr=True).print("本阶段为独立 Python 采集器，不支持数据库导入。")
        return 2
    return asyncio.run(run(args))
