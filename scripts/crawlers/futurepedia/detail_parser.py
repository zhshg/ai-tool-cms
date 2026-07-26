import re
from datetime import datetime
from urllib.parse import urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup, Tag

from .cleaners import build_meta_description, build_meta_title, clean_text, clean_website_url, normalize_slug, sanitize_html, truncate_words
from .models import SourceCategory, SourceMetadata, ToolRecord


class DetailParser:
    def parse(self, html: str, source_url: str, crawled_at: datetime, status: str) -> ToolRecord:
        soup = BeautifulSoup(html, "lxml")
        slug = normalize_slug(urlsplit(source_url).path.rstrip("/").split("/")[-1])
        name = self._name(soup, slug)
        website = self._website(soup)
        if not website:
            raise ValueError("详情页缺少合法官网地址")
        summary = truncate_words(self._first_text(soup, ("p.my-2", "main h1 + p", 'meta[name="description"]')) or "", 120)
        content = self._content(soup, name)
        description = truncate_words(self._description(content, soup, summary), 600)
        categories = self._categories(soup)
        pricing = self._pricing(soup)
        logo = self._logo(soup, name, source_url)
        screenshots = self._screenshots(soup, name, source_url, logo)
        published = crawled_at if status == "PUBLISHED" else None
        metadata = SourceMetadata(
            sourceUrl=source_url, sourceSlug=slug, sourceCategories=categories,
            sourcePricingModel=pricing, screenshots=screenshots, crawledAt=crawled_at,
            tags=[item.name for item in categories],
        )
        return ToolRecord(
            name=name, slug=slug, website=website, summary=summary,
            description=description, longDescription=sanitize_html(str(content) if content else description, source_url),
            logoUrl=logo, pricingModel=self._normalize_pricing(pricing), status=status,
            metaTitle=build_meta_title(name), metaDescription=build_meta_description(summary, description),
            publishedAt=published, metadata=metadata,
        )

    def _name(self, soup: BeautifulSoup, slug: str) -> str:
        h1 = soup.select_one("h1")
        if h1 and clean_text(h1.get_text(" ")):
            return clean_text(h1.get_text(" "))
        meta = soup.select_one('meta[property="og:title"]')
        value = str(meta.get("content", "")) if meta else (soup.title.get_text() if soup.title else slug)
        return re.sub(r"\s*[:|-]\s*(Use Cases|Features|Pricing|Review).*$", "", clean_text(value), flags=re.I)

    def _website(self, soup: BeautifulSoup) -> str | None:
        for anchor in soup.select("a[href]"):
            text = clean_text(anchor.get_text(" ")).lower()
            if anchor.has_attr("data-tool-name") or "visit site" in text:
                url = clean_website_url(str(anchor.get("href")))
                if url:
                    return url
        return None

    def _first_text(self, soup: BeautifulSoup, selectors: tuple[str, ...]) -> str | None:
        for selector in selectors:
            node = soup.select_one(selector)
            if node:
                value = str(node.get("content", "")) if node.name == "meta" else node.get_text(" ")
                if clean_text(value):
                    return clean_text(value)
        return None

    def _content(self, soup: BeautifulSoup, name: str) -> Tag | None:
        for selector in ("section.content", "main article", '[data-testid="tool-content"]'):
            node = soup.select_one(selector)
            if isinstance(node, Tag):
                return node
        heading = next((h for h in soup.select("h2, h3") if clean_text(h.get_text()).lower().startswith("what is")), None)
        return heading.parent if isinstance(heading, Tag) and isinstance(heading.parent, Tag) else soup.select_one("main")

    def _description(self, content: Tag | None, soup: BeautifulSoup, summary: str) -> str:
        if content:
            heading = next((h for h in content.select("h2, h3") if clean_text(h.get_text()).lower().startswith("what is")), None)
            if heading:
                paragraph = heading.find_next("p")
                if paragraph:
                    return clean_text(paragraph.get_text(" "))
        return self._first_text(soup, ('meta[property="og:description"]', 'meta[name="description"]')) or summary

    def _categories(self, soup: BeautifulSoup) -> list[SourceCategory]:
        result: list[SourceCategory] = []
        seen: set[str] = set()
        label = soup.find(string=re.compile(r"AI\s+Categories\s*:", re.I))
        container = label.parent if label and isinstance(label.parent, Tag) else soup
        while isinstance(container, Tag) and not container.select('a[href^="/ai-tools/"]') and container.parent:
            container = container.parent
        anchors = container.select('a[href^="/ai-tools/"]') if isinstance(container, Tag) else []
        for anchor in anchors:
            slug = normalize_slug(urlsplit(str(anchor.get("href"))).path.split("/")[-1])
            if slug and slug not in seen:
                seen.add(slug)
                result.append(SourceCategory(name=clean_text(anchor.get_text(" ")) or slug, slug=slug))
        return result

    def _pricing(self, soup: BeautifulSoup) -> str:
        text = clean_text(soup.get_text(" "))
        match = re.search(r"Pricing Model:\s*(Free Trial|Contact for Pricing|Open Source|Freemium|Free|Paid)", text, re.I)
        return match.group(1) if match else "Unknown"

    def _normalize_pricing(self, value: str) -> str:
        lower = value.lower()
        if "freemium" in lower: return "Freemium"
        if lower == "free" or "trial" in lower or "open source" in lower: return "Free"
        if "paid" in lower: return "Paid"
        if "contact" in lower: return "Contact"
        return "Unknown"

    def _best_image(self, image: Tag, base: str) -> str | None:
        candidates: list[tuple[int, str]] = []
        for item in str(image.get("srcset", "")).split(","):
            bits = item.strip().split()
            if bits:
                width = int(bits[1][:-1]) if len(bits) > 1 and bits[1].endswith("w") and bits[1][:-1].isdigit() else 0
                candidates.append((width, bits[0]))
        src = str(image.get("src", ""))
        if src: candidates.append((int(image.get("width", 0) or 0), src))
        if not candidates: return None
        value = urljoin(base, max(candidates)[1])
        parts = urlsplit(value)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))

    def _logo(self, soup: BeautifulSoup, name: str, base: str) -> str | None:
        for image in soup.select("img"):
            alt = str(image.get("alt", ""))
            if "logo" in alt.lower() and (name.lower() in alt.lower() or not name):
                return self._best_image(image, base)
        return None

    def _screenshots(self, soup: BeautifulSoup, name: str, base: str, logo: str | None) -> list[str]:
        result: list[str] = []
        for image in soup.select("img"):
            alt = str(image.get("alt", ""))
            width = int(image.get("width", 0) or 0)
            if "logo" in alt.lower() or (width and width < 640): continue
            url = self._best_image(image, base)
            if url and url != logo and url not in result: result.append(url)
        return result[:5]
