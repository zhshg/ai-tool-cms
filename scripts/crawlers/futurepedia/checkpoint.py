import json
import os
from datetime import datetime, timezone
from pathlib import Path

from .models import CheckpointState


def atomic_write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, default=str)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temp, path)


class CheckpointStore:
    def __init__(self, path: Path):
        self.path = path

    def load(self) -> CheckpointState:
        if not self.path.exists():
            return CheckpointState()
        return CheckpointState.model_validate_json(self.path.read_text(encoding="utf-8"))

    def save(self, state: CheckpointState) -> None:
        state.updatedAt = datetime.now(timezone.utc)
        atomic_write_json(self.path, state.model_dump(mode="json"))
