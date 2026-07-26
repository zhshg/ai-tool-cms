"""快速估算 aitools.fyi 工具总量"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

def get_next_data(url):
    resp = client.get(url)
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        return json.loads(match.group(1))
    return None

# 1. 检查分页是否有效
print("=== 分页测试 ===")
for page in [1, 2, 3, 5, 10]:
    url = f"https://aitools.fyi/zh/category/ai-productivity?page={page}" if page > 1 else "https://aitools.fyi/zh/category/ai-productivity"
    data = get_next_data(url)
    if data:
        tools = data.get("props", {}).get("pageProps", {}).get("tools", [])
        pp = data.get("props", {}).get("pageProps", {})
        keys = list(pp.keys())
        print(f"Page {page}: {len(tools)} tools, pageProps keys={keys}")
    else:
        print(f"Page {page}: No data")

# 2. 检查各分类工具数量
print("\n=== 分类工具数量 ===")
categories = [
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

total_tools = 0
all_tool_ids = set()
for cat_slug in categories:
    data = get_next_data(f"https://aitools.fyi/zh/category/{cat_slug}")
    if data:
        pp = data.get("props", {}).get("pageProps", {})
        tools = pp.get("tools", [])
        regular_ids = pp.get("regularToolsIds", [])
        cat = pp.get("category", {})
        cat_tools_count = len(cat.get("tools", [])) if isinstance(cat.get("tools"), list) else 0
        
        # 收集工具ID
        for t in tools:
            if "id" in t:
                all_tool_ids.add(t["id"])
        
        print(f"  {cat_slug}: {len(tools)} tools on page, {len(regular_ids)} regular IDs, {cat_tools_count} total in category")
        total_tools += cat_tools_count
    else:
        print(f"  {cat_slug}: No data")

print(f"\n总计: {total_tools} 工具条目（可能有重复）")
print(f"去重工具ID: {len(all_tool_ids)}")

# 3. 检查是否有 API
print("\n=== 检查 API ===")
resp = client.get("https://aitools.fyi/api/tools?category=ai-productivity")
print(f"/api/tools status: {resp.status_code}")
if resp.status_code == 200 and resp.text.strip():
    try:
        d = resp.json()
        print(f"API keys: {list(d.keys())[:10]}")
    except:
        print(f"API response: {resp.text[:200]}")

# 检查 Next.js API 路由
resp2 = client.get("https://aitools.fyi/api/category/ai-productivity")
print(f"/api/category/... status: {resp2.status_code}")

client.close()