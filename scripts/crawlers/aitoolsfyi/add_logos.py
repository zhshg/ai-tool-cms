"""添加 Logo URL 并生成最终导出"""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx


INPUT_FILE = Path("storage/crawler/aitoolsfyi/tools_cleaned.json")
OUTPUT_FILE = Path("storage/crawler/aitoolsfyi/final_tools.json")

# 使用 Google favicon API 获取网站图标
FAVICON_API = "https://www.google.com/s2/favicons"


def get_favicon_url(website: str) -> str | None:
    """获取网站的 favicon URL"""
    try:
        parsed = urlparse(website)
        domain = parsed.netloc
        if domain:
            return f"{FAVICON_API}?domain={domain}&sz=128"
    except Exception:
        pass
    return None


def main():
    print("=== 添加 Logo URL ===")

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data["items"]
    print(f"处理工具数: {len(items)}")

    # 为每个工具添加 favicon URL
    for item in items:
        website = item.get("website", "")
        if website:
            favicon = get_favicon_url(website)
            if favicon:
                item["logoUrl"] = favicon

    # 统计
    has_logo = sum(1 for item in items if item.get("logoUrl"))
    print(f"成功添加 Logo: {has_logo}/{len(items)} ({has_logo/len(items)*100:.1f}%)")

    # 生成最终输出
    output = {
        "source": "aitoolsfyi",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(items),
        "items": items,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n已保存到: {OUTPUT_FILE}")

    # 最终统计
    print(f"\n=== 最终数据统计 ===")
    print(f"总工具数: {len(items)}")

    # 价格分布
    pricing = {}
    for item in items:
        p = item["pricingModel"]
        pricing[p] = pricing.get(p, 0) + 1
    print(f"价格模型: {pricing}")

    # 分类分布
    all_cats = {}
    for item in items:
        for cat in item["metadata"]["sourceCategories"]:
            slug = cat["slug"]
            all_cats[slug] = all_cats.get(slug, 0) + 1
    print(f"覆盖分类: {len(all_cats)} 个")

    # 示例
    print(f"\n=== 示例工具 ===")
    for item in items[:3]:
        print(f"\n{item['name']} ({item['slug']})")
        print(f"  网站: {item['website']}")
        print(f"  价格: {item['pricingModel']}")
        print(f"  分类: {[c['name'] for c in item['metadata']['sourceCategories']]}")
        print(f"  Logo: {item.get('logoUrl', 'N/A')}")
        if item.get("zhDescription"):
            print(f"  中文描述: {item['zhDescription'][:100]}...")


if __name__ == "__main__":
    main()