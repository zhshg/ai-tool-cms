"""深入分析 aitools.fyi 的分页机制和总量"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

# 1. 检查不同分页
print("=== 检查 ?page= 参数分页 ===")
for page in [1, 2, 3, 5, 10]:
    url = f"https://aitools.fyi/zh/category/ai-productivity?page={page}" if page > 1 else "https://aitools.fyi/zh/category/ai-productivity"
    resp = client.get(url)
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        data = json.loads(match.group(1))
        tools = data.get("props", {}).get("pageProps", {}).get("tools", [])
        regular_ids = data.get("props", {}).get("pageProps", {}).get("regularToolsIds", [])
        print(f"Page {page}: {len(tools)} tools, {len(regular_ids)} regularToolsIds")
        
        # 检查第一个和最后一个工具的 slug
        if tools:
            print(f"  First: {tools[0]['slug']}, Last: {tools[-1]['slug']}")
        
        # 检查 category 中的 tools 总数
        cat = data.get("props", {}).get("pageProps", {}).get("category", {})
        if "tools" in cat:
            print(f"  Category tools count: {cat['tools']}")
    else:
        print(f"Page {page}: No __NEXT_DATA__ found")

# 2. 检查首页
print("\n=== 首页数据 ===")
resp = client.get("https://aitools.fyi/zh")
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
if match:
    data = json.loads(match.group(1))
    pp = data.get("props", {}).get("pageProps", {})
    print(f"首页 pageProps 键: {list(pp.keys())}")
    for key, value in pp.items():
        if isinstance(value, list):
            print(f"  {key}: {len(value)} items")
        elif isinstance(value, dict):
            print(f"  {key}: dict with keys {list(value.keys())[:5]}")

# 3. 查找 API 端点
print("\n=== 查找 API 端点 ===")
# 检查是否有 /api/ 路径
resp = client.get("https://aitools.fyi/api/tools?category=ai-productivity&page=1")
print(f"API response status: {resp.status_code}")
if resp.status_code == 200:
    try:
        api_data = resp.json()
        print(f"API response keys: {list(api_data.keys())}")
        if "tools" in api_data:
            print(f"Tools count in API: {len(api_data['tools'])}")
    except:
        print(f"API response (first 500): {resp.text[:500]}")

# 4. 检查几个分类的工具数量
print("\n=== 各分类工具数量 ===")
test_categories = ["ai-productivity", "ai-image-generation", "ai-code-assistant", "ai-chat-bot", "ai-marketing"]
for cat_slug in test_categories:
    resp = client.get(f"https://aitools.fyi/zh/category/{cat_slug}")
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        data = json.loads(match.group(1))
        cat = data.get("props", {}).get("pageProps", {}).get("category", {})
        tools_count = cat.get("tools", "N/A")
        tools_on_page = len(data.get("props", {}).get("pageProps", {}).get("tools", []))
        print(f"  {cat_slug}: total={tools_count}, on_first_page={tools_on_page}")

client.close()