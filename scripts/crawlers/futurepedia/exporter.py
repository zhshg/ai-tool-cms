import json
from datetime import datetime
from pathlib import Path

from .checkpoint import atomic_write_json
from .models import CrawlerError, CrawlerReport, ExportEnvelope


class JsonExporter:
    def __init__(self, output: Path):
        self.output = output
        self.directory = output.parent

    def export_tools(self, envelope: ExportEnvelope) -> None:
        atomic_write_json(self.output, envelope.model_dump(mode="json"))

    def append_tools(self, records: list[dict], start_index: int, total: int) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        if self.output.exists():
            with self.output.open("r", encoding="utf-8") as f:
                data = json.load(f)
            data["items"].extend(records)
            data["total"] = total
            data["generatedAt"] = datetime.now().isoformat() + "Z"
        else:
            data = {
                "source": "futurepedia",
                "generatedAt": datetime.now().isoformat() + "Z",
                "total": total,
                "items": records,
            }
        atomic_write_json(self.output, data)

    def export_errors(self, errors: list[CrawlerError]) -> None:
        atomic_write_json(self.directory / "errors.json", [item.model_dump(mode="json") for item in errors])

    def export_report(self, report: CrawlerReport) -> None:
        atomic_write_json(self.directory / "report.json", report.model_dump(mode="json"))


def download_asset_bytes(target: Path, payload: bytes) -> bool:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists(): return False
    target.write_bytes(payload)
    return True
