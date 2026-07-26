from datetime import datetime, timezone
from pathlib import Path
import subprocess
import sys

import httpx
import pytest

from scripts.crawlers.futurepedia.cli import main
from scripts.crawlers.futurepedia.client import AccessDeniedError, CrawlerClient, NotFoundError
from scripts.crawlers.futurepedia.config import CrawlerConfig
from scripts.crawlers.futurepedia.exporter import JsonExporter
from scripts.crawlers.futurepedia.models import CrawlerReport, ExportEnvelope


@pytest.mark.asyncio
async def test_client_retries_server_errors():
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(200 if calls == 3 else 503, text="<html><body>ok</body></html>")

    async def no_sleep(_: float) -> None:
        return None

    config = CrawlerConfig(retries=3, delayMin=0, delayMax=0)
    async with CrawlerClient(config, transport=httpx.MockTransport(handler), sleep=no_sleep) as client:
        result = await client.get_html("https://www.futurepedia.io/tool/x", check_robots=False)
    assert result.status == 200
    assert calls == 3


@pytest.mark.asyncio
async def test_client_classifies_403_and_404():
    async def no_sleep(_: float) -> None:
        return None

    for status, error in ((403, AccessDeniedError), (404, NotFoundError)):
        transport = httpx.MockTransport(lambda request, value=status: httpx.Response(value))
        async with CrawlerClient(CrawlerConfig(delayMin=0, delayMax=0), transport=transport, sleep=no_sleep) as client:
            with pytest.raises(error):
                await client.get_html("https://www.futurepedia.io/tool/x", check_robots=False)


def test_exporter_writes_envelope_and_report(tmp_path):
    exporter = JsonExporter(tmp_path / "tools.json")
    envelope = ExportEnvelope(generatedAt=datetime.now(timezone.utc), total=0, items=[])
    report = CrawlerReport(startedAt=datetime.now(timezone.utc))
    exporter.export_tools(envelope)
    exporter.export_report(report)
    assert '"source": "futurepedia"' in (tmp_path / "tools.json").read_text(encoding="utf-8")
    assert (tmp_path / "report.json").exists()


def test_cli_rejects_database_import():
    assert main(["--import-db"]) == 2


def test_entry_script_runs_from_repository_root():
    root = Path(__file__).parents[3]
    result = subprocess.run(
        [sys.executable, "scripts/crawlers/futurepedia_crawler.py", "--help"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "--detail-url" in result.stdout
