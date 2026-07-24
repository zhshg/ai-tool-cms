"""尝试获取工具详情页"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

# 获取一个分类的工具列表
resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
data = json.loads(match.group(1))
tools = data.get("props", {}).get("pageProps", {}).get("tools", [])

# 尝试访问工具详情页
if tools:
    tool = tools[0]
    slug = tool["slug"]
    print(f"尝试获取工具详情: {slug}")
    
    # 尝试不同的 URL 模式
    urls = [
        f"https://aitools.fyi/{slug}",
        f"https://aitools.fyi/zh/{slug}",
        f"https://aitools.fyi/tool/{slug}",
        f"https://aitools.fyi/zh/tool/{slug}",
    ]
    
    for url in urls:
        resp = client.get(url)
        print(f"  {url}: status={resp.status_code}, len={len(resp.text)}")
        if resp.status_code == 200 and len(resp.text) > 1000:
            # 检查是否有 __NEXT_DATA__
            match2 = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
            if match2:
                detail_data = json.loads(match2.group(1))
                pp = detail_data.get("props", {}).get("pageProps", {})
                print(f"    pageProps keys: {list(pp.keys())}")
                # 打印部分数据
                for k, v in pp.items():
                    if isinstance(v, dict):
                        print(f"    {k}: {list(v.keys())[:10]}")
                    elif isinstance(v, list):
                        print(f"    {k}: {len(v)} items")
                    else:
                        print(f"    {k}: {str(v)[:100]}")
            break

# 检查 category.tools 中的完整工具列表
print("\n=== category.tools 完整工具列表 ===")
cat = data.get("props", {}).get("pageProps", {}).get("category", {})
cat_tools = cat.get("tools", [])
print(f"Total tools in category: {len(cat_tools)}")
print(f"First 5 tool IDs: {[t['id'] for t in cat_tools[:5]]}")

# 检查 regularToolsIds
regular_ids = data.get("props", {}).get("pageProps", {}).get("regularToolsIds", [])
print(f"Regular tools IDs count: {len(regular_ids)}")
print(f"First 5 regular IDs: {regular_ids[:5]}")

# 尝试通过 ID 直接访问
if regular_ids:
    test_id = regular_ids[0]
    print(f"\n尝试通过 ID 访问工具: {test_id}")
    id_urls = [
        f"https://aitools.fyi/api/tools/{test_id}",
        f"https://aitools.fyi/api/tool/{test_id}",
    ]
    for url in id_urls:
        resp = client.get(url)
        print(f"  {url}: status={resp.status_code}")

client.close()