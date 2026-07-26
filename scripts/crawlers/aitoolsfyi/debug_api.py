"""调查 API 为什么返回空结果"""
import json

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://aitools.fyi",
    "Referer": "https://aitools.fyi/zh/category/ai-video-generation",
})

api_url = "https://aitools.fyi/api/tool/category-load-more"

# 测试缺失的工具 ID
test_ids = [94, 140, 149, 168, 465]  # Elai, Fliki, Pictory AI, etc.
print(f"测试工具 ID: {test_ids}")

payload = {"toolIds": test_ids}
resp = client.post(api_url, json=payload)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")

# 测试混合 ID（已知存在 + 缺失）
print("\n=== 测试混合 ID ===")
mixed_ids = [265, 94, 140]  # PromptPal + Elai + Fliki
payload2 = {"toolIds": mixed_ids}
resp2 = client.post(api_url, json=payload2)
print(f"Status: {resp2.status_code}")
if resp2.status_code == 200:
    data2 = resp2.json()
    if isinstance(data2, list):
        print(f"返回 {len(data2)} 个工具:")
        for t in data2:
            print(f"  {t['name']} (ID: {t['id']})")

# 测试单个 ID
print("\n=== 测试单个 ID ===")
for tid in [94, 265]:
    payload3 = {"toolIds": [tid]}
    resp3 = client.post(api_url, json=payload3)
    if resp3.status_code == 200:
        data3 = resp3.json()
        if isinstance(data3, list):
            print(f"  ID {tid}: {len(data3)} tools - {[t['name'] for t in data3]}")
        else:
            print(f"  ID {tid}: type={type(data3).__name__}")

client.close()