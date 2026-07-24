import re
from datetime import datetime, timezone

from .models import SourceMetadata, ToolRecord


def normalize_slug(name: str) -> str:
    """将工具名称转换为 slug"""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug.strip("-")


def clean_text(text: str) -> str:
    """清理文本，移除多余空白"""
    return " ".join(text.split())


def truncate_words(text: str, max_words: int) -> str:
    """截断文本到指定字数"""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def build_meta_title(name: str) -> str:
    """构建 SEO 标题"""
    return f"{name} - AI工具介绍 | Toolsdar"


def build_meta_description(summary: str, description: str) -> str:
    """构建 SEO 描述"""
    text = summary if len(summary) > 50 else description
    return truncate_words(clean_text(text), 150)


class CardParser:
    """解析工具卡片数据并转换为 ToolRecord"""

    def parse(self, card_data: dict, crawled_at: datetime, status: str) -> ToolRecord:
        """将卡片数据转换为标准工具记录"""
        name = clean_text(card_data["name"])
        slug = normalize_slug(name)
        website = card_data["website"]
        description = clean_text(card_data.get("description", ""))
        summary = truncate_words(description, 120)

        # 处理 Logo
        logo_url = card_data.get("logo")
        if logo_url and not logo_url.startswith("http"):
            logo_url = None

        # 处理价格模型
        pricing = card_data.get("pricing", "Unknown")
        pricing_model = self._normalize_pricing(pricing)

        # 处理分类
        categories = card_data.get("categories", [])

        # 构建元数据
        metadata = SourceMetadata(
            sourceUrl=website,
            sourceSlug=slug,
            sourceCategories=categories,
            sourcePricingModel=pricing,
            crawledAt=crawled_at,
            rating=card_data.get("rating"),
            tags=[cat.name for cat in categories],
        )

        published_at = crawled_at if status == "PUBLISHED" else None

        return ToolRecord(
            name=name,
            slug=slug,
            website=website,
            summary=summary,
            description=description,
            longDescription=description,  # aitools.fyi 通常只有短描述
            logoUrl=logo_url,
            pricingModel=pricing_model,
            status=status,
            metaTitle=build_meta_title(name),
            metaDescription=build_meta_description(summary, description),
            publishedAt=published_at,
            metadata=metadata,
        )

    def _normalize_pricing(self, value: str) -> str:
        """标准化价格模型"""
        lower = value.lower()
        if "免费试用" in lower or "free trial" in lower:
            return "Free Trial"
        if lower == "免费" or "free" in lower:
            return "Free"
        if "付费" in lower or "paid" in lower:
            return "Paid"
        if "免费试用和收费混合" in lower or "freemium" in lower:
            return "Freemium"
        return "Unknown"