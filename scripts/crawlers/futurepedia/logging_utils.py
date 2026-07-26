import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from rich.console import Console


SENSITIVE_KEYS = {"token", "api_key", "apikey", "key", "secret", "password", "auth", "authorization"}


def redact_url(value: str) -> str:
    parts = urlsplit(value)
    query = urlencode([(key, "***" if key.lower() in SENSITIVE_KEYS else item) for key, item in parse_qsl(parts.query, keep_blank_values=True)])
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))


class StepLogger:
    def __init__(self, *, level: str = "info", log_file: Path | None = None, console: bool = True):
        self.level = getattr(logging, level.upper())
        self.console = Console(stderr=True, force_terminal=False) if console else None
        self.file_handler: RotatingFileHandler | None = None
        self.lock = Lock()
        if log_file:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            self.file_handler = RotatingFileHandler(log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
            self.file_handler.setFormatter(logging.Formatter("%(asctime)s.%(msecs)03d %(message)s", "%Y-%m-%d %H:%M:%S"))

    def _write(self, level: int, stage: str, message: str, **context: object) -> None:
        if level < self.level: return
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        suffix = " ".join(f"{key}={value}" for key, value in context.items() if value is not None)
        line = f"{timestamp} [{logging.getLevelName(level)}] [{stage}] {message}" + (f" | {suffix}" if suffix else "")
        with self.lock:
            if self.console: self.console.print(line, markup=False)
            if self.file_handler:
                record = logging.LogRecord("futurepedia", level, "", 0, line, (), None)
                self.file_handler.emit(record)

    def debug(self, stage: str, message: str, **context: object) -> None: self._write(logging.DEBUG, stage, message, **context)
    def info(self, stage: str, message: str, **context: object) -> None: self._write(logging.INFO, stage, message, **context)
    def warning(self, stage: str, message: str, **context: object) -> None: self._write(logging.WARNING, stage, message, **context)
    def error(self, stage: str, message: str, **context: object) -> None: self._write(logging.ERROR, stage, message, **context)
    def close(self) -> None:
        if self.file_handler: self.file_handler.close()


NULL_LOGGER = StepLogger(level="error", console=False)
