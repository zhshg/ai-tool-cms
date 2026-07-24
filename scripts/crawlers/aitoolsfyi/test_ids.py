"""尝试通过 ID 访问工具"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

# 从分类页获取工具 ID 列表
resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
data = json.loads(match.group(1))

# 获取前5个工具 ID
cat_tools = data.get("props", {}).get("pageProps", {}).get("category", {}).get("tools", [])
test_ids = [t["id"] for t in cat_tools[:5]]
print(f"Test IDs: {test_ids}")

# 尝试用 ID 访问
for tid in test_ids:
    url = f"https://aitools.fyi/{tid}"
    resp = client.get(url)
    print(f"  {url}: status={resp.status_code}")
    if resp.status_code == 200:
        match2 = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
        if match2:
            td = json.loads(match2.group(1))
            pp = td.get("props", {}).get("pageProps", {})
            if "tool" in pp:
                tool = pp["tool"]
                print(f"    Tool: {tool.get('name')}, slug={tool.get('slug')}")
            else:
                print(f"    No tool data, keys: {list(pp.keys())[:5]}")
    elif resp.status_code == 404:
        print(f"    Not found (404)")

# 尝试用 API 路由访问
print("\n=== 尝试 Next.js API ===")
build_id = data.get("buildId", "MFLA5Mu-VYjlccuL7L5bN")

# 尝试 _next/data 路由获取分页数据
for page in [2, 3]:
    next_url = f"https://aitools.fyi/_next/data/{build_id}/zh/category/ai-productivity.json?page={page}"
    resp = client.get(next_url)
    print(f"Next.js data route page={page}: status={resp.status_code}")
    if resp.status_code == 200:
        d = resp.json()
        tools = d.get("pageProps", {}).get("tools", [])
        print(f"  Tools: {len(tools)}")
        if tools:
            print(f"  First: {tools[0].get('slug')}, Last: {tools[-1].get('slug')}")

# 尝试 _next/data 路由 + cursor
for cursor in [10, 20, 50]:
    next_url = f"https://aitools.fyi/_next/data/{build_id}/zh/category/ai-productivity.json?cursor={cursor}"
    resp = client.get(next_url)
    if resp.status_code == 200:
        d = resp.json()
        tools = d.get("pageProps", {}).get("tools", [])
        if tools:
            print(f"Cursor={cursor}: {len(tools)} tools, first={tools[0].get('slug')}, last={tools[-1].get('slug')}")

client.close()