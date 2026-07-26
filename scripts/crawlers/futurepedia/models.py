from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class SourceCategory(BaseModel):
    name: str
    slug: str


class WebsiteCheck(BaseModel):
    status: int | None = None
    finalUrl: str | None = None
    checkedAt: datetime | None = None


class SourceMetadata(BaseModel):
    source: Literal["futurepedia"] = "futurepedia"
    sourceUrl: str
    sourceSlug: str
    sourceCategories: list[SourceCategory] = Field(default_factory=list)
    sourcePricingModel: str | None = None
    screenshots: list[str] = Field(default_factory=list)
    crawledAt: datetime
    websiteCheck: WebsiteCheck | None = None
    crawlerVersion: str = "1.0.0"
    tags: list[str] = Field(default_factory=list)


class ToolRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    slug: str
    website: HttpUrl
    summary: str
    description: str
    longDescription: str
    logoUrl: HttpUrl | None = None
    pricingModel: str
    status: Literal["PUBLISHED", "DRAFT"]
    metaTitle: str
    metaDescription: str
    publishedAt: datetime | None
    scheduledAt: datetime | None = None
    metadata: SourceMetadata


class CrawlerError(BaseModel):
    url: str
    stage: str
    message: str
    occurredAt: datetime


class CrawlerReport(BaseModel):
    source: Literal["futurepedia"] = "futurepedia"
    startedAt: datetime
    completedAt: datetime | None = None
    categoriesDiscovered: int = 0
    categoriesProcessed: int = 0
    pagesProcessed: int = 0
    toolUrlsDiscovered: int = 0
    toolsParsed: int = 0
    created: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    duplicates: int = 0
    unmatchedCategories: int = 0
    missingWebsite: int = 0
    missingLogo: int = 0
    errors: list[CrawlerError] = Field(default_factory=list)


class CheckpointState(BaseModel):
    processedUrls: list[str] = Field(default_factory=list)
    pendingUrls: list[str] = Field(default_factory=list)
    processedListPages: list[str] = Field(default_factory=list)
    categoryPages: dict[str, int] = Field(default_factory=dict)
    savedCount: int = 0
    updatedAt: datetime | None = None


class ExportEnvelope(BaseModel):
    source: Literal["futurepedia"] = "futurepedia"
    generatedAt: datetime
    total: int
    items: list[ToolRecord]
