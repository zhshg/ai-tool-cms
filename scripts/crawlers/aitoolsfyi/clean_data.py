"""数据清洗和标准化导出"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path


INPUT_FILE = Path("storage/crawler/aitoolsfyi/tools_raw.json")
OUTPUT_FILE = Path("storage/crawler/aitoolsfyi/tools_cleaned.json")

# 价格类型映射
PRICING_MAP = {
    "Free": "Free",
    "Paid": "Paid",
    "Freemium": "Freemium",
    "Free Trial": "Free Trial",
    "Unknown": "Unknown",
}


def clean_text(text: str) -> str:
    """清理文本"""
    if not text:
        return ""
    # 清理多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def truncate_description(text: str, max_words: int = 150) -> str:
    """截断描述到指定字数"""
    if not text:
        return ""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def build_meta_title(name: str) -> str:
    """构建 SEO 标题"""
    return f"{name} - AI工具介绍 | Toolsdar"


def build_meta_description(description: str) -> str:
    """构建 SEO 描述"""
    return truncate_description(clean_text(description), 50)


def extract_logo_url(tool: dict) -> str | None:
    """提取 Logo URL"""
    # API 不直接返回 logo URL，需要通过其他方式获取
    # 可以通过工具详情页获取，但为了效率，这里先留空
    return None


def normalize_tool(raw_tool: dict) -> dict:
    """标准化单个工具数据"""
    name = clean_text(raw_tool.get("name", ""))
    slug = raw_tool.get("slug", "")
    website = raw_tool.get("website", "")
    description = clean_text(raw_tool.get("description", ""))
    zh_description = clean_text(raw_tool.get("zhDescription", ""))
    pricing_type = raw_tool.get("pricingType", "Unknown")
    category = raw_tool.get("category", {})
    is_ad = raw_tool.get("isAd", False)

    # 优先使用中文描述作为 summary
    summary = truncate_description(zh_description or description, 120)

    # 分类信息
    categories = []
    if category:
        cat_name = category.get("name", "")
        cat_slug = category.get("slug", "")
        if cat_name and cat_slug:
            categories.append({
                "name": cat_name,
                "slug": cat_slug,
            })

    # 标准化价格模型
    pricing_model = PRICING_MAP.get(pricing_type, "Unknown")

    now = datetime.now(timezone.utc)

    return {
        "name": name,
        "slug": slug,
        "website": website,
        "summary": summary,
        "description": description or zh_description,
        "longDescription": description or zh_description,
        "logoUrl": None,  # 需要额外获取
        "pricingModel": pricing_model,
        "status": "PUBLISHED",
        "metaTitle": build_meta_title(name),
        "metaDescription": build_meta_description(summary),
        "publishedAt": now.isoformat(),
        "metadata": {
            "source": "aitoolsfyi",
            "sourceUrl": website,
            "sourceSlug": slug,
            "sourceCategories": categories,
            "sourcePricingModel": pricing_type,
            "crawledAt": now.isoformat(),
            "rating": raw_tool.get("totalUpvotes"),
            "tags": [cat["slug"] for cat in categories],
        },
        "isAd": is_ad,
        "sourceCategory": raw_tool.get("sourceCategory", ""),
        "zhDescription": zh_description,
    }


def main():
    print("=== 数据清洗和标准化 ===")

    # 读取原始数据
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    raw_items = raw_data["items"]
    print(f"原始工具数: {len(raw_items)}")

    # 清洗数据
    cleaned = []
    errors = []

    for item in raw_items:
        try:
            normalized = normalize_tool(item)
            # 验证必填字段
            if not normalized["name"] or not normalized["website"]:
                errors.append(item.get("slug", "unknown"))
                continue
            cleaned.append(normalized)
        except Exception as e:
            errors.append(f"{item.get('slug', 'unknown')}: {e}")

    print(f"清洗后工具数: {len(cleaned)}")
    if errors:
        print(f"错误数: {len(errors)}")
        for e in errors[:10]:
            print(f"  {e}")

    # 保存清洗后的数据
    output = {
        "source": "aitoolsfyi",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(cleaned),
        "items": cleaned,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n已保存到: {OUTPUT_FILE}")

    # 统计信息
    pricing_dist = {}
    for item in cleaned:
        p = item["pricingModel"]
        pricing_dist[p] = pricing_dist.get(p, 0) + 1

    print(f"\n价格模型分布:")
    for p, count in sorted(pricing_dist.items(), key=lambda x: -x[1]):
        print(f"  {p}: {count}")

    # 检查 Logo 覆盖情况
    has_logo = sum(1 for item in cleaned if item.get("logoUrl"))
    print(f"\n有 Logo 的工具: {has_logo}/{len(cleaned)}")

    # 输出示例
    print(f"\n示例输出 (前2个):")
    for item in cleaned[:2]:
        print(f"  {item['name']} ({item['slug']})")
        print(f"    价格: {item['pricingModel']}")
        print(f"    分类: {[c['slug'] for c in item['metadata']['sourceCategories']]}")


if __name__ == "__main__":
    main()