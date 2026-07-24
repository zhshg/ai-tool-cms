"""查找 aitools.fyi 的加载更多 API"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
html = resp.text

# 查找 API 端点
patterns = [
    r'(https?://[^"\']+api[^"\']*)',
    r'(https?://[^"\']+tools[^"\']*)',
    r'fetch\(["\']([^"\']+)["\']',
    r'axios\.[a-zA-Z]+\(["\']([^"\']+)["\']',
    r'["\'](/api/[^"\']+)["\']',
    r'["\'](/tools/[^"\']+)["\']',
    r'["\'](/_next/[^"\']+)["\']',
]

for pattern in patterns:
    matches = re.findall(pattern, html)
    if matches:
        unique = list(set(matches))[:10]
        print(f"Pattern '{pattern[:30]}...': {len(matches)} matches")
        for m in unique:
            print(f"  {m}")

# 查看 Next.js 数据路由
print("\n=== 检查 Next.js 数据路由 ===")
# Next.js uses /_next/data/ for client-side data fetching
build_id_match = re.search(r'"buildId":\s*"([^"]+)"', html)
if build_id_match:
    build_id = build_id_match.group(1)
    print(f"Build ID: {build_id}")
    
    # 尝试 Next.js 数据路由
    data_url = f"https://aitools.fyi/_next/data/{build_id}/zh/category/ai-productivity.json?page=2"
    print(f"\n尝试: {data_url}")
    resp2 = client.get(data_url)
    print(f"Status: {resp2.status_code}")
    if resp2.status_code == 200:
        try:
            data = resp2.json()
            pp = data.get("pageProps", {})
            tools = pp.get("tools", [])
            print(f"Tools count: {len(tools)}")
            if tools:
                print(f"First: {tools[0]['slug']}, Last: {tools[-1]['slug']}")
        except Exception as e:
            print(f"Error parsing: {e}")

# 直接尝试常见 API 路径
print("\n=== 尝试常见 API 路径 ===")
api_paths = [
    "/api/tools?category=ai-productivity&page=2",
    "/api/category/ai-productivity?page=2",
    "/api/aitools/category/ai-productivity?page=2",
    "/zh/category/ai-productivity.json?page=2",
]

for path in api_paths:
    url = f"https://aitools.fyi{path}"
    try:
        r = client.get(url)
        print(f"  {path}: status={r.status_code}, len={len(r.text)}")
        if r.status_code == 200 and len(r.text) < 2000:
            print(f"    Response: {r.text[:200]}")
    except Exception as e:
        print(f"  {path}: error={e}")

client.close()