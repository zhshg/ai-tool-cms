import argparse
import asyncio
from collections.abc import Sequence
from pathlib import Path

from rich.console import Console

from .client import CrawlerClient
from .config import CrawlerConfig
from .crawler import AitoolsfyiCrawler
from .exporter import JsonExporter
from .logging_utils import StepLogger


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="aitools.fyi 生产级独立采集器")
    parser.add_argument("--category", action="append", default=[], help="指定要采集的分类 slug")
    parser.add_argument("--max-tools", type=int, default=10000, help="最大采集工具数量")
    parser.add_argument("--max-pages", type=int, default=200, help="每个分类最大分页数")
    parser.add_argument("--concurrency", type=int, default=5, help="并发数")
    parser.add_argument("--delay-min", type=float, default=1.5, help="最小延迟（秒）")
    parser.add_argument("--delay-max", type=float, default=4.0, help="最大延迟（秒）")
    parser.add_argument("--timeout", type=float, default=30, help="请求超时（秒）")
    parser.add_argument("--retries", type=int, default=3, help="重试次数")
    parser.add_argument("--output", type=Path, default=Path("storage/crawler/aitoolsfyi/tools.json"), help="输出文件路径")
    parser.add_argument("--checkpoint", type=Path, default=Path("storage/crawler/aitoolsfyi/checkpoint.json"), help="断点文件路径")
    parser.add_argument("--resume", action="store_true", help="从断点恢复")
    parser.add_argument("--dry-run", action="store_true", help="试运行，不保存数据")
    parser.add_argument("--status", choices=("published", "draft"), default="published", help="工具状态")
    parser.add_argument("--log-level", choices=("debug", "info", "warning", "error"), default="info", help="日志级别")
    parser.add_argument("--log-file", type=Path, default=Path("storage/crawler/aitoolsfyi/crawler.log"), help="日志文件路径")
    parser.add_argument("--console-log", action=argparse.BooleanOptionalAction, default=True, help="是否输出控制台日志")
    return parser


async def run(args: argparse.Namespace) -> int:
    logger = StepLogger(level=args.log_level, log_file=args.log_file, console=args.console_log)
    logger.info("BOOT", "启动 aitools.fyi 采集器")
    config = CrawlerConfig(
        categories=args.category,
        maxTools=args.max_tools,
        maxPages=args.max_pages,
        concurrency=args.concurrency,
        delayMin=args.delay_min,
        delayMax=args.delay_max,
        timeout=args.timeout,
        retries=args.retries,
        output=args.output,
        checkpoint=args.checkpoint,
        resume=args.resume,
        dryRun=args.dry_run,
        status="PUBLISHED" if args.status == "published" else "DRAFT",
    )
    logger.info("CONFIG", "运行参数已加载", maxTools=config.maxTools, maxPages=config.maxPages, concurrency=config.concurrency, dryRun=config.dryRun, output=config.output)

    async with CrawlerClient(config, logger=logger) as client:
        envelope, report = await AitoolsfyiCrawler(config, client, logger).run()

    exporter = JsonExporter(config.output)
    logger.info("EXPORT", "开始写入错误和报告", output=config.output)
    exporter.export_errors(report.errors)
    exporter.export_report(report)
    logger.info("EXPORT", "导出完成", tools=envelope.total, errors=len(report.errors), directory=config.output.parent)
    logger.info("DONE", "全部步骤执行完成", parsed=report.toolsParsed, failed=report.failed, output=config.output)
    logger.close()
    return 0 if report.toolsParsed or not report.failed else 1


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return asyncio.run(run(args))


if __name__ == "__main__":
    exit(main())