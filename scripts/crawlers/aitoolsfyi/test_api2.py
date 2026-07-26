"""深入测试 API 响应"""
import json

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json, */*",
    "Origin": "https://aitools.fyi",
    "Referer": "https://aitools.fyi/zh/category/ai-productivity",
})

api_url = "https://aitools.fyi/api/tool/category-load-more"

# 尝试不同的 payload
payloads = [
    {"category": "ai-productivity", "page": 2},
    {"category": "ai-productivity", "page": 2, "locale": "zh"},
    {"category": "ai-productivity", "page": 2, "limit": 12},
    {"categorySlug": "ai-productivity", "page": 2},
    {"category": "ai-productivity", "page": "2"},
]

for i, payload in enumerate(payloads):
    resp = client.post(api_url, json=payload)
    print(f"Payload {i}: {json.dumps(payload)}")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text[:300]}")
    print()

# 也尝试 GET 请求
print("=== 尝试 GET 请求 ===")
resp_get = client.get(api_url, params={"category": "ai-productivity", "page": 2})
print(f"GET Status: {resp_get.status_code}")
print(f"GET Response: {resp_get.text[:300]}")

client.close()