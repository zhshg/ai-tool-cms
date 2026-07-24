"""验证分页 - 检查不同页面是否返回不同工具"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

def get_tools(page):
    url = f"https://aitools.fyi/zh/category/ai-productivity?page={page}" if page > 1 else "https://aitools.fyi/zh/category/ai-productivity"
    resp = client.get(url)
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        data = json.loads(match.group(1))
        return data.get("props", {}).get("pageProps", {}).get("tools", [])
    return []

# 检查前5页的工具是否不同
print("=== 验证分页唯一性 ===")
all_slugs = set()
for page in [1, 2, 3, 4, 5]:
    tools = get_tools(page)
    slugs = [t["slug"] for t in tools]
    new_slugs = [s for s in slugs if s not in all_slugs]
    all_slugs.update(slugs)
    print(f"Page {page}: {len(tools)} tools, {len(new_slugs)} new")
    if tools:
        print(f"  First: {tools[0]['slug']}, Last: {tools[-1]['slug']}")

# 检查第50页是否有数据
print("\n=== 检查深分页 ===")
for page in [20, 30, 40, 50, 60]:
    tools = get_tools(page)
    slugs = [t["slug"] for t in tools]
    new_slugs = [s for s in slugs if s not in all_slugs]
    all_slugs.update(slugs)
    print(f"Page {page}: {len(tools)} tools, {len(new_slugs)} new")
    if not tools:
        print(f"  -> Empty page, stopping")
        break

# 检查 ai-design 分类（最大分类之一）
print("\n=== ai-design 深分页测试 ===")
design_total = 0
for page in [1, 10, 20, 30, 40, 50, 60, 70, 80]:
    url = f"https://aitools.fyi/zh/category/ai-design?page={page}" if page > 1 else "https://aitools.fyi/zh/category/ai-design"
    resp = client.get(url)
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        data = json.loads(match.group(1))
        tools = data.get("props", {}).get("pageProps", {}).get("tools", [])
        cat = data.get("props", {}).get("pageProps", {}).get("category", {})
        cat_total = len(cat.get("tools", [])) if isinstance(cat.get("tools"), list) else 0
        design_total = cat_total
        print(f"Page {page}: {len(tools)} tools, category total={cat_total}")
        if not tools:
            print(f"  -> Empty page")
            break

client.close()