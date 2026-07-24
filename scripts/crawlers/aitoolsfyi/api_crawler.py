"""aitools.fyi 高效爬虫 - 基于 toolIds API

使用方式:
    python -m aitoolsfyi.api_crawler
    python -m aitoolsfyi.api_crawler --categories ai-productivity,ai-design
    python -m aitoolsfyi.api_crawler --resume
"""
import argparse
import json
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx


BASE_URL = "https://aitools.fyi"
API_URL = f"{BASE_URL}/api/tool/category-load-more"

CATEGORIES = [
    "ai-productivity", "ai-image-generation", "ai-code-assistant",
    "ai-chat-bot", "ai-marketing", "ai-education",
    "ai-web-apps", "ai-analytics", "ai-social-media-assistant",
    "ai-shopify-apps", "ai-sales", "ai-web3",
    "ai-assistant", "ai-gaming", "ai-image-editing",
    "ai-copywriting", "ai-model-generation", "ai-healthcare",
    "ai-summarizer", "ai-photo-editing", "ai-avatar-generation",
    "ai-fun-tools", "ai-image-generation-model", "ai-presentation",
    "ai-customer-support", "ai-content-creation", "ai-companion",
    "ai-research", "ai-email-assistant", "ai-search-engine",
    "ai-sql-query", "ai-noise-cancellation", "ai-human-resource",
    "ai-news", "ai-e-commerce", "ai-legal",
    "ai-paraphraser", "ai-video-editing", "ai-all-in-one",
    "ai-automation", "ai-3d-generation", "ai-hosting",
    "ai-finance", "ai-large-language-model", "ai-branding",
    "ai-nsfw", "ai-resume", "ai-travel",
    "ai-translation", "ai-developer", "ai-excel",
    "ai-real-estate", "ai-medical-assistant", "ai-ai-detection",
    "ai-nudity", "ai-astrology", "ai-dating",
    "ai-anime-generator", "ai-text-to-speech-tts", "ai-homework",
    "ai-stock-market", "ai-ai-girlfriend", "ai-agents",
    "ai-directories", "ai-kids", "ai-fashion",
    "ai-physical-products", "ai-web-scraping", "ai-text-generation",
    "ai-pdf", "ai-writing-assistant", "ai-meeting-assistant",
    "ai-video-generation", "ai-data-science", "ai-project-management",
    "ai-audio-generation", "ai-design",
]

BATCH_SIZE = 12
OUTPUT_DIR = Path("storage/crawler/aitoolsfyi")
CHECKPOINT_FILE = OUTPUT_DIR / "checkpoint.json"
OUTPUT_FILE = OUTPUT_DIR / "tools_raw.json"


def sanitize_text(text: str) -> str:
    """清理文本中的非法 Unicode 字符"""
    if not text:
        return ""
    # 清理代理对（surrogate pairs）
    cleaned = re.sub(r"[\ud800-\udfff]", "", text)
    return cleaned


def get_client() -> httpx.Client:
    """创建 HTTP 客户端"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Origin": BASE_URL,
        "Referer": f"{BASE_URL}/zh/category/ai-productivity",
        "Sec-Ch-Ua": '"HeadlessChrome";v="149", "Chromium";v="149", "Not)A;Brand"',
        "Sec-Ch-Ua-Platform": '"Windows"',
    }
    return httpx.Client(
        timeout=30,
        follow_redirects=True,
        headers=headers,
    )


def fetch_category_tool_ids(client: httpx.Client, category_slug: str) -> list[int]:
    """从分类页面获取所有工具 ID"""
    url = f"{BASE_URL}/zh/category/{category_slug}"
    try:
        resp = client.get(url)
        resp.raise_for_status()
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
        if not match:
            print(f"  [{category_slug}] 未找到 __NEXT_DATA__")
            return []
        data = json.loads(match.group(1))
        cat_tools = data.get("props", {}).get("pageProps", {}).get("category", {}).get("tools", [])
        tool_ids = [t["id"] for t in cat_tools]
        return tool_ids
    except Exception as e:
        print(f"  [{category_slug}] 获取工具ID失败: {e}")
        return []


def fetch_tools_by_ids(client: httpx.Client, tool_ids: list[int], max_retries: int = 3) -> list[dict]:
    """通过 API 获取工具数据"""
    payload = {"toolIds": tool_ids}
    for attempt in range(max_retries):
        try:
            resp = client.post(API_URL, json=payload)
            resp.raise_for_status()
            tools = resp.json()
            if isinstance(tools, list):
                return tools
            return []
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                wait = 2 ** attempt
                print(f"  速率限制，等待 {wait}s...")
                time.sleep(wait)
            elif e.response.status_code >= 500:
                if attempt < max_retries - 1:
                    time.sleep(1)
                else:
                    print(f"  服务器错误: {e}")
                    return []
            else:
                print(f"  HTTP 错误: {e}")
                return []
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                print(f"  请求失败: {e}")
                return []
    return []


def normalize_tool(tool: dict[str, Any], category_slug: str) -> dict[str, Any]:
    """标准化工具数据"""
    return {
        "id": tool.get("id"),
        "name": sanitize_text(tool.get("name", "")),
        "slug": tool.get("slug", ""),
        "website": tool.get("website", ""),
        "description": sanitize_text(tool.get("description", "")),
        "zhDescription": sanitize_text(tool.get("zhDescription", "")),
        "pricingType": tool.get("pricingType", "Unknown"),
        "isAd": tool.get("isAd", False),
        "totalUpvotes": tool.get("totalUpvotes", 0),
        "category": tool.get("category", []),
        "sourceCategory": category_slug,
    }


def load_checkpoint() -> dict:
    """加载断点"""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "processedCategories": [],
        "processedIds": [],
        "totalTools": 0,
        "updatedAt": None,
    }


def save_checkpoint(state: dict) -> None:
    """保存断点"""
    state["updatedAt"] = datetime.now(timezone.utc).isoformat()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def save_tools(tools: list[dict]) -> None:
    """保存工具数据"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "source": "aitoolsfyi",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(tools),
        "items": tools,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description="aitools.fyi API 爬虫")
    parser.add_argument("--categories", type=str, default=None, help="指定分类（逗号分隔）")
    parser.add_argument("--max-tools", type=int, default=10000, help="最大工具数")
    parser.add_argument("--resume", action="store_true", help="从断点恢复")
    parser.add_argument("--no-save", action="store_true", help="不保存中间结果")
    args = parser.parse_args()

    # 确定分类列表
    if args.categories:
        target_categories = [c.strip() for c in args.categories.split(",")]
    else:
        target_categories = CATEGORIES

    # 加载断点
    checkpoint = load_checkpoint() if args.resume else {
        "processedCategories": [],
        "processedIds": [],
        "totalTools": 0,
    }

    processed_categories = set(checkpoint.get("processedCategories", []))
    processed_ids = set(checkpoint.get("processedIds", []))

    print(f"=== aitools.fyi API 爬虫 ===")
    print(f"目标分类: {len(target_categories)}")
    print(f"已处理分类: {len(processed_categories)}")
    print(f"已处理工具ID: {len(processed_ids)}")
    print(f"最大工具数: {args.max_tools}")

    client = get_client()
    all_tools: list[dict] = []
    seen_ids: set[int] = set(processed_ids)
    new_count = 0

    try:
        for i, cat_slug in enumerate(target_categories):
            if cat_slug in processed_categories:
                print(f"\n[{i+1}/{len(target_categories)}] 跳过已处理: {cat_slug}")
                continue

            if len(seen_ids) >= args.max_tools:
                print(f"\n已达最大工具数 {args.max_tools}，停止")
                break

            print(f"\n[{i+1}/{len(target_categories)}] 处理: {cat_slug}")

            # 1. 获取分类的所有工具 ID
            tool_ids = fetch_category_tool_ids(client, cat_slug)
            print(f"  工具ID数量: {len(tool_ids)}")

            if not tool_ids:
                processed_categories.add(cat_slug)
                save_checkpoint({
                    "processedCategories": list(processed_categories),
                    "processedIds": list(seen_ids),
                    "totalTools": len(all_tools),
                })
                continue

            # 2. 过滤已处理的 ID
            new_ids = [tid for tid in tool_ids if tid not in seen_ids]
            print(f"  新增ID数量: {len(new_ids)}")

            if not new_ids:
                processed_categories.add(cat_slug)
                save_checkpoint({
                    "processedCategories": list(processed_categories),
                    "processedIds": list(seen_ids),
                    "totalTools": len(all_tools),
                })
                continue

            # 3. 分批获取工具数据
            category_tools = []
            for batch_start in range(0, len(new_ids), BATCH_SIZE):
                batch_ids = new_ids[batch_start:batch_start + BATCH_SIZE]
                
                # 检查是否超过限制
                if len(all_tools) + len(category_tools) >= args.max_tools:
                    remaining = args.max_tools - len(all_tools) - len(category_tools)
                    if remaining <= 0:
                        break
                    batch_ids = batch_ids[:remaining]

                tools = fetch_tools_by_ids(client, batch_ids)
                for tool in tools:
                    tid = tool.get("id")
                    if tid and tid not in seen_ids:
                        seen_ids.add(tid)
                        normalized = normalize_tool(tool, cat_slug)
                        category_tools.append(normalized)

                # 限速
                if batch_start + BATCH_SIZE < len(new_ids):
                    delay = random.uniform(0.3, 0.8)
                    time.sleep(delay)

                if (batch_start // BATCH_SIZE + 1) % 5 == 0:
                    print(f"    进度: {batch_start + len(batch_ids)}/{len(new_ids)} IDs, 已获取 {len(category_tools)} 工具")

            # 4. 保存本分类的结果
            all_tools.extend(category_tools)
            new_count += len(category_tools)
            print(f"  本分类新增: {len(category_tools)}, 累计: {len(all_tools)}")

            # 5. 标记分类为已处理
            processed_categories.add(cat_slug)

            # 6. 保存断点和中间结果
            if not args.no_save:
                checkpoint_state = {
                    "processedCategories": list(processed_categories),
                    "processedIds": list(seen_ids),
                    "totalTools": len(all_tools),
                }
                save_checkpoint(checkpoint_state)

                # 每5个分类保存一次完整数据
                if len(processed_categories) % 5 == 0:
                    save_tools(all_tools)
                    print(f"  已保存中间结果: {len(all_tools)} 工具")

    except KeyboardInterrupt:
        print("\n\n用户中断，保存进度...")
    finally:
        client.close()

    # 保存最终结果
    save_tools(all_tools)
    save_checkpoint({
        "processedCategories": list(processed_categories),
        "processedIds": list(seen_ids),
        "totalTools": len(all_tools),
    })

    print(f"\n=== 完成 ===")
    print(f"共采集: {len(all_tools)} 个独立工具")
    print(f"新增: {new_count}")
    print(f"输出文件: {OUTPUT_FILE}")
    print(f"断点文件: {CHECKPOINT_FILE}")


if __name__ == "__main__":
    main()