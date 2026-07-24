from pathlib import Path

from pydantic import BaseModel, Field, model_validator


class CrawlerConfig(BaseModel):
    categories: list[str] = Field(default_factory=list)
    maxTools: int = Field(default=10000, ge=1)
    maxPages: int = Field(default=50, ge=1)
    concurrency: int = Field(default=5, ge=1, le=10)
    delayMin: float = Field(default=1.5, ge=0)
    delayMax: float = Field(default=4.0, ge=0)
    timeout: float = Field(default=30.0, gt=0)
    retries: int = Field(default=3, ge=0, le=10)
    output: Path = Path("storage/crawler/aitoolsfyi/tools.json")
    checkpoint: Path = Path("storage/crawler/aitoolsfyi/checkpoint.json")
    resume: bool = False
    dryRun: bool = False
    status: str = "PUBLISHED"
    userAgent: str = "AI-Tool-CMS-Aitoolsfyi-Crawler/1.0 (+https://toolsdar.com)"
    cookie: str | None = None
    proxy: str | None = None

    @model_validator(mode="after")
    def validate_delays(self) -> "CrawlerConfig":
        if self.delayMax < self.delayMin:
            raise ValueError("delay-max 不能小于 delay-min")
        return self