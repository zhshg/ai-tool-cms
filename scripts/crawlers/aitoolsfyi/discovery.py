import re
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

from .models import SourceCategory


BASE_URL = "https://aitools.fyi"
ZH_BASE_URL = "https://aitools.fyi/zh"

CATEGORY_RE = re.compile(r"^/zh/category/([a-z0-9-]+)/?$")


def is_category_url(url: str) -> bool:
    """检查是否为分类链接"""
    parts = urlsplit(urljoin(BASE_URL, url))
    return parts.hostname in {"aitools.fyi", "www.aitools.fyi"} and bool(CATEGORY_RE.match(parts.path))


def discover_categories(html: str) -> list[SourceCategory]:
    """从分类页面提取所有分类"""
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
            name = anchor.get_text(" ", strip=True) or slug.replace("-", " ").title()
            result.append(SourceCategory(name=name, slug=slug))

    return result


def parse_tool_cards(html: str) -> list[dict]:
    """从分类列表页提取所有工具卡片信息"""
    soup = BeautifulSoup(html, "lxml")
    tools: list[dict] = []

    # aitools.fyi 的工具卡片通常包含 h2 标题和链接
    for card in soup.select("h2"):
        # 向上查找到卡片容器（尝试找更大的容器）
        container = card.parent
        attempts = 0
        while container and container.name != "body" and attempts < 5:
            # 尝试找到包含链接的容器
            links = container.select("a[href]")
            if links and len(links) > 2:  # 至少要有几个链接
                break
            container = container.parent
            attempts += 1

        if not container or container.name == "body":
            continue

        # 提取工具名称
        name = card.get_text(" ", strip=True)
        if not name:
            continue

        # 提取工具官网链接（第一个外部链接）
        website = None
        for link in links:
            href = str(link.get("href", ""))
            # 跳过站内链接
            if "/category/" in href or "/tool/" in href or href.startswith("/"):
                continue
            # 外部链接（包括带统计参数的）
            if href.startswith("http"):
                website = href
                break

        if not website:
            continue

        # 提取描述
        description = ""
        desc_p = card.find_next("p")
        if desc_p:
            description = desc_p.get_text(" ", strip=True)

        # 提取评分（通常在名称附近，数字后面可能跟文字）
        rating = None
        rating_container = card.parent if card.parent else container
        # 查找包含数字的文本节点
        for text_node in rating_container.find_all(string=re.compile(r"\d{1,3}")):
            text = text_node.strip()
            # 检查是否是评分（通常在0-100之间）
            if text.isdigit():
                try:
                    score = float(text)
                    if 0 <= score <= 100:
                        rating = score
                        break
                except (ValueError, AttributeError):
                    pass

        # 提取 Logo（查找最近的图片）
        logo = None
        # 先在同级或父级容器中查找
        img_container = card.parent if card.parent else container
        for _ in range(3):  # 向上查找3层
            if img_container:
                img = img_container.select_one("img[src]")
                if img:
                    src = img.get("src") or img.get("data-src")
                    if src and not src.endswith(".svg"):  # 跳过 SVG 图标
                        logo = urljoin(BASE_URL, src)
                        break
                img_container = img_container.parent if img_container.parent else None

        # 提取价格模型（查找包含价格关键词的文本）
        pricing = "Unknown"
        full_text = container.get_text(" ", strip=True)
        if "免费试用" in full_text or "free trial" in full_text.lower():
            pricing = "Free Trial"
        elif "免费试用和收费混合" in full_text:
            pricing = "Freemium"
        elif "免费" in full_text and "免费试用" not in full_text:
            pricing = "Free"
        elif "付费" in full_text or "paid" in full_text.lower():
            pricing = "Paid"

        # 提取分类标签（查找所有分类链接）
        categories: list[SourceCategory] = []
        seen_cats: set[str] = set()
        for cat_link in container.select('a[href*="/category/"]'):
            cat_href = str(cat_link.get("href", ""))
            cat_match = CATEGORY_RE.match(urlsplit(cat_href).path)
            if cat_match:
                cat_slug = cat_match.group(1)
                if cat_slug not in seen_cats:
                    seen_cats.add(cat_slug)
                    cat_name = cat_link.get_text(" ", strip=True) or cat_slug
                    categories.append(SourceCategory(name=cat_name, slug=cat_slug))

        tool_data = {
            "name": name,
            "website": website,
            "description": description,
            "rating": rating,
            "logo": logo,
            "pricing": pricing,
            "categories": categories,
        }

        # 避免重复
        if not any(t["website"] == website for t in tools):
            tools.append(tool_data)

    return tools


def has_next_page(html: str) -> bool:
    """检查是否有下一页"""
    soup = BeautifulSoup(html, "lxml")
    # 检查是否有下一页链接或分页指示
    return bool(soup.select_one('a[href*="page="], a[rel="next"], a:contains("下一页")'))


def should_stop_pagination(current: list[dict], previous: list[dict], has_next: bool, page: int = 1, max_pages: int = 50, total: int = 0, max_tools: int = 200) -> bool:
    """判断是否应该停止分页"""
    if not current:
        return True
    if page >= max_pages:
        return True
    if total >= max_tools:
        return True
    if not has_next:
        return True
    # 如果当前页和上一页完全相同，说明到达末尾
    current_urls = {t["website"] for t in current}
    previous_urls = {t["website"] for t in previous}
    if current_urls == previous_urls and previous_urls:
        return True
    return False