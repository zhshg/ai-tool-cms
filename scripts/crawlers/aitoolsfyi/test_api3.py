"""验证 toolIds API 方式"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://aitools.fyi",
    "Referer": "https://aitools.fyi/zh/category/ai-productivity",
})

# 1. 从分类页获取所有工具 ID
print("=== 获取工具 ID ===")
resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
data = json.loads(match.group(1))

cat_tools = data.get("props", {}).get("pageProps", {}).get("category", {}).get("tools", [])
tool_ids = [t["id"] for t in cat_tools]
print(f"Total tool IDs: {len(tool_ids)}")

# 2. 用 API 获取第一批工具数据
print("\n=== API 获取工具数据 ===")
api_url = "https://aitools.fyi/api/tool/category-load-more"

# 测试前12个
batch = tool_ids[:12]
payload = {"toolIds": batch}
resp = client.post(api_url, json=payload)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    tools = resp.json()
    print(f"Tools count: {len(tools)}")
    if tools:
        print(f"\nFirst tool keys: {list(tools[0].keys())}")
        print(f"First tool: {json.dumps(tools[0], ensure_ascii=False)[:500]}")
        
        # 检查有哪些字段
        for t in tools[:1]:
            for k, v in t.items():
                if isinstance(v, str):
                    print(f"  {k}: {v[:80] if len(v) > 80 else v}")
                elif isinstance(v, dict):
                    print(f"  {k}: {list(v.keys())[:5]}")
                elif isinstance(v, list):
                    print(f"  {k}: list with {len(v)} items")
                else:
                    print(f"  {k}: {v}")

# 3. 测试多个批次
print("\n=== 测试多批次 ===")
all_tools = []
batch_size = 12
for i in range(0, min(48, len(tool_ids)), batch_size):
    batch = tool_ids[i:i+batch_size]
    payload = {"toolIds": batch}
    resp = client.post(api_url, json=payload)
    if resp.status_code == 200:
        tools = resp.json()
        all_tools.extend(tools)
        print(f"  Batch {i//batch_size + 1}: {len(tools)} tools")
    else:
        print(f"  Batch {i//batch_size + 1}: error {resp.status_code}")

print(f"\nTotal tools fetched: {len(all_tools)}")

# 4. 测试获取所有 673 个工具
print("\n=== 获取全部工具 ===")
all_category_tools = []
for i in range(0, len(tool_ids), batch_size):
    batch = tool_ids[i:i+batch_size]
    payload = {"toolIds": batch}
    resp = client.post(api_url, json=payload)
    if resp.status_code == 200:
        tools = resp.json()
        all_category_tools.extend(tools)
    else:
        print(f"  Error at batch {i//batch_size}: {resp.status_code}")

print(f"Total tools from category: {len(all_category_tools)}")

# 保存结果
with open("test_api_tools.json", "w", encoding="utf-8") as f:
    json.dump(all_category_tools, f, ensure_ascii=False, indent=2)

client.close()