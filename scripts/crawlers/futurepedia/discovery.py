import re
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

from .models import SourceCategory


BASE_URL = "https://www.futurepedia.io"
CATEGORY_RE = re.compile(r"^/ai-tools/([a-z0-9-]+)/?$")
DETAIL_RE = re.compile(r"^/tool/([a-z0-9-]+)/?$")


def is_category_url(url: str) -> bool:
    parts = urlsplit(urljoin(BASE_URL, url))
    return parts.hostname in {"futurepedia.io", "www.futurepedia.io"} and bool(CATEGORY_RE.match(parts.path))


def is_detail_url(url: str) -> bool:
    parts = urlsplit(urljoin(BASE_URL, url))
    return parts.hostname in {"futurepedia.io", "www.futurepedia.io"} and bool(DETAIL_RE.match(parts.path))


def discover_categories(html: str) -> list[SourceCategory]:
    soup = BeautifulSoup(html, "lxml")
    result: list[SourceCategory] = []
    seen: set[str] = set()
    for anchor in soup.select("a[href]"):
        href = str(anchor.get("href", ""))
        if not is_category_url(href):
            continue
        match = CATEGORY_RE.match(urlsplit(urljoin(BASE_URL, href)).path)
        slug = match.group(1) if match else ""
        if slug and slug not in seen:
            seen.add(slug)
            result.append(SourceCategory(name=anchor.get_text(" ", strip=True) or slug.replace("-", " ").title(), slug=slug))
    return result


def parse_tool_urls(html: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    result: list[str] = []
    seen: set[str] = set()
    for anchor in soup.select("a[href]"):
        url = urljoin(BASE_URL, str(anchor.get("href", "")))
        if is_detail_url(url) and url not in seen:
            seen.add(url)
            result.append(url)
    return result


def has_next_page(html: str) -> bool:
    soup = BeautifulSoup(html, "lxml")
    return bool(soup.select_one('a[rel="next"], a[aria-label*="Next" i], a[href*="page="]'))


def should_stop_pagination(current: set[str], previous: set[str], has_next: bool, page: int = 1, max_pages: int = 50, total: int = 0, max_tools: int = 200) -> bool:
    return not current or current == previous or not has_next or page >= max_pages or total >= max_tools
