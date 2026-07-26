"""测试 API - 带 Cookie"""
import json

import httpx


# 先访问页面获取 Cookie
client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
})

# 第一步：访问页面获取 Cookie
print("=== 获取初始 Cookie ===")
resp1 = client.get("https://aitools.fyi/zh/category/ai-productivity")
print(f"Page status: {resp1.status_code}")
print(f"Cookies: {dict(client.cookies)}")

# 第二步：带 Cookie 调用 API
print("\n=== 调用 API ===")
api_url = "https://aitools.fyi/api/tool/category-load-more"
headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, */*",
    "Origin": "https://aitools.fyi",
    "Referer": "https://aitools.fyi/zh/category/ai-productivity",
    "X-Requested-With": "XMLHttpRequest",
}

for page in [1, 2, 3]:
    payload = {"category": "ai-productivity", "page": page}
    resp = client.post(api_url, json=payload, headers=headers)
    print(f"Page {page}: status={resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        if isinstance(data, list):
            print(f"  Tools: {len(data)}")
            if data:
                print(f"  First: {data[0].get('slug')}, Last: {data[-1].get('slug')}")
        else:
            print(f"  Type: {type(data).__name__}, preview: {str(data)[:200]}")
    else:
        print(f"  Error: {resp.text[:200]}")

client.close()