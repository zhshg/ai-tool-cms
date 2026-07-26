import re
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup, Comment
from slugify import slugify


TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "referrer", "source", "via",
}
ALLOWED_TAGS = {"h2", "h3", "p", "ul", "ol", "li", "strong", "a"}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", BeautifulSoup(value or "", "lxml").get_text(" ")).strip()


def normalize_slug(value: str) -> str:
    return slugify(value, lowercase=True, regex_pattern=r"[^-a-z0-9]+")


def clean_website_url(value: str | None) -> str | None:
    if not value:
        return None
    value = value.replace("&amp;", "&").strip()
    parts = urlsplit(value)
    host = (parts.hostname or "").lower()
    if parts.scheme not in {"http", "https"} or not host or host == "futurepedia.io" or host.endswith(".futurepedia.io"):
        return None
    query = urlencode([(key, item) for key, item in parse_qsl(parts.query, keep_blank_values=True) if key.lower() not in TRACKING_PARAMS])
    return urlunsplit((parts.scheme, parts.netloc, parts.path or "/", query, ""))


def canonical_domain(value: str) -> str:
    host = (urlsplit(value).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def truncate_words(value: str, limit: int) -> str:
    value = clean_text(value)
    if len(value) <= limit:
        return value
    cut = value[: limit + 1].rsplit(" ", 1)[0]
    return (cut or value[:limit]).rstrip(" ,.;:-")


def sanitize_html(value: str, base_url: str) -> str:
    soup = BeautifulSoup(value or "", "lxml")
    root = soup.body or soup
    for node in root.find_all(string=lambda text: isinstance(text, Comment)):
        node.extract()
    for tag in list(root.find_all(True)):
        if tag.parent is None:
            continue
        if tag.name in {"html", "body"}:
            continue
        if tag.name not in ALLOWED_TAGS:
            if tag.name in {"script", "style", "svg", "button", "iframe", "form", "nav", "footer"}:
                tag.decompose()
            else:
                tag.unwrap()
            continue
        href = tag.get("href") if tag.name == "a" else None
        tag.attrs = {}
        if href:
            absolute = urljoin(base_url, href)
            if urlsplit(absolute).scheme in {"http", "https"}:
                tag["href"] = absolute
    return "".join(str(item) for item in root.contents).strip()


def build_meta_title(name: str) -> str:
    return truncate_words(f"{name}: Features, Pricing & Review", 65)


def build_meta_description(summary: str, description: str) -> str:
    text = clean_text(description or summary)
    if len(text) < 120 and summary and summary not in text:
        text = f"{summary} {text}"
    return truncate_words(text, 165)
