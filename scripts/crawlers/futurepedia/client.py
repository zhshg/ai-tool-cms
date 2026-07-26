import asyncio
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from email.utils import parsedate_to_datetime
from urllib import robotparser

import httpx

from .config import CrawlerConfig
from .logging_utils import NULL_LOGGER, StepLogger, redact_url


class CrawlerHttpError(RuntimeError): pass
class AccessDeniedError(CrawlerHttpError): pass
class NotFoundError(CrawlerHttpError): pass
class RobotsDeniedError(CrawlerHttpError): pass


@dataclass(frozen=True)
class FetchResult:
    url: str
    status: int
    html: str


class CrawlerClient:
    def __init__(self, config: CrawlerConfig, *, transport: httpx.AsyncBaseTransport | None = None, sleep: Callable[[float], Awaitable[None]] = asyncio.sleep, logger: StepLogger = NULL_LOGGER):
        self.config = config
        self.sleep = sleep
        self.logger = logger
        headers = {"User-Agent": config.userAgent, "Accept": "text/html,application/xhtml+xml"}
        if config.cookie: headers["Cookie"] = config.cookie
        kwargs: dict[str, object] = {"headers": headers, "timeout": config.timeout, "follow_redirects": True, "transport": transport}
        if config.proxy: kwargs["proxy"] = config.proxy
        self.http = httpx.AsyncClient(**kwargs)
        self._robots: robotparser.RobotFileParser | None = None

    async def __aenter__(self) -> "CrawlerClient": return self
    async def __aexit__(self, *_: object) -> None: await self.http.aclose()

    async def _robots_allowed(self, url: str) -> bool:
        if self._robots is None:
            parser = robotparser.RobotFileParser()
            parser.set_url("https://www.futurepedia.io/robots.txt")
            try:
                self.logger.info("ROBOTS", "获取 robots.txt", url=parser.url)
                response = await self.http.get(parser.url)
                parser.parse(response.text.splitlines() if response.status_code == 200 else [])
            except httpx.HTTPError:
                parser.parse([])
            self._robots = parser
        allowed = self._robots.can_fetch(self.config.userAgent, url)
        self.logger.debug("ROBOTS", "访问规则检查完成", url=redact_url(url), allowed=allowed)
        return allowed

    async def get_html(self, url: str, *, check_robots: bool = True) -> FetchResult:
        if check_robots and not await self._robots_allowed(url):
            raise RobotsDeniedError(f"robots.txt 禁止访问: {url}")
        last_error: Exception | None = None
        for attempt in range(self.config.retries + 1):
            if attempt or self.config.delayMax:
                delay = random.uniform(self.config.delayMin, self.config.delayMax) + (2 ** max(0, attempt - 1) if attempt else 0)
                self.logger.debug("DELAY", "请求前等待", seconds=f"{delay:.2f}")
                await self.sleep(delay)
            try:
                self.logger.info("REQUEST", "发送 HTTP 请求", method="GET", url=redact_url(url), attempt=f"{attempt + 1}/{self.config.retries + 1}")
                response = await self.http.get(url)
                self.logger.info("RESPONSE", "收到 HTTP 响应", status=response.status_code, bytes=len(response.content), url=redact_url(url))
                if response.status_code == 403: raise AccessDeniedError(f"HTTP 403: {url}")
                if response.status_code == 404: raise NotFoundError(f"HTTP 404: {url}")
                if response.status_code == 429 or 500 <= response.status_code < 600:
                    if attempt < self.config.retries:
                        retry_after = response.headers.get("Retry-After")
                        wait = float(retry_after) if retry_after and retry_after.isdigit() else 2 ** attempt
                        self.logger.warning("RETRY", "可恢复请求失败，准备重试", status=response.status_code, attempt=f"{attempt + 1}/{self.config.retries + 1}", wait=f"{wait:.2f}s")
                        if retry_after and retry_after.isdigit(): await self.sleep(wait)
                        continue
                    raise CrawlerHttpError(f"HTTP {response.status_code}: {url}")
                response.raise_for_status()
                html = response.text
                if "<html" not in html.lower() and "<!doctype" not in html.lower():
                    raise CrawlerHttpError(f"响应不是有效 HTML: {url}")
                return FetchResult(str(response.url), response.status_code, html)
            except (AccessDeniedError, NotFoundError):
                raise
            except (httpx.HTTPError, CrawlerHttpError) as error:
                last_error = error
                if attempt >= self.config.retries: break
        raise CrawlerHttpError(str(last_error or f"请求失败: {url}"))
