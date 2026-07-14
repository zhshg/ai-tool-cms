from pathlib import Path

from scripts.crawlers.futurepedia.cli import build_parser
from scripts.crawlers.futurepedia.logging_utils import StepLogger, redact_url


def test_step_logger_writes_utf8_stage_and_context(tmp_path):
    path = tmp_path / "crawler.log"
    logger = StepLogger(level="debug", log_file=path, console=False)
    logger.info("CATEGORY", "开始分类", category="写作工具", index="1/2")
    logger.close()
    text = path.read_text(encoding="utf-8")
    assert "[INFO] [CATEGORY] 开始分类" in text
    assert "category=写作工具" in text
    assert "index=1/2" in text


def test_logger_filters_debug_at_info_level(tmp_path):
    path = tmp_path / "crawler.log"
    logger = StepLogger(level="info", log_file=path, console=False)
    logger.debug("PARSE", "不可见")
    logger.warning("RETRY", "需要重试", attempt="1/4")
    logger.close()
    text = path.read_text(encoding="utf-8")
    assert "不可见" not in text
    assert "[WARNING] [RETRY]" in text


def test_redact_url_hides_sensitive_query_values():
    value = redact_url("https://example.com/path?token=secret&id=7&api_key=hidden")
    assert "secret" not in value
    assert "hidden" not in value
    assert "id=7" in value


def test_cli_accepts_detailed_logging_options():
    args = build_parser().parse_args([
        "--log-level", "debug", "--log-file", "crawler.log", "--no-console-log"
    ])
    assert args.log_level == "debug"
    assert args.log_file == Path("crawler.log")
    assert args.console_log is False
