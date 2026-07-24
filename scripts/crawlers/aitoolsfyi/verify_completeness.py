"""验证是否有遗漏的工具"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})

# 读取已采集的工具
with open("storage/crawler/aitoolsfyi/final_tools.json", "r", encoding="utf-8") as f:
    data = json.load(f)

existing_slugs = set(item["slug"] for item in data["items"])
print(f"已采集工具数: {len(existing_slugs)}")

# 检查一些后面的分类，看是否有遗漏
test_categories = [
    "ai-video-generation", "ai-data-science", "ai-audio-generation",
    "ai-design", "ai-writing-assistant", "ai-finance",
]

total_missing = 0
for cat_slug in test_categories:
    url = f"https://aitools.fyi/zh/category/{cat_slug}"
    resp = client.get(url)
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', resp.text)
    if match:
        cat_data = json.loads(match.group(1))
        cat_tools = cat_data.get("props", {}).get("pageProps", {}).get("category", {}).get("tools", [])
        all_ids = [t["id"] for t in cat_tools]
        missing = [tid for tid in all_ids if tid not in existing_ids]
        
        if missing:
            print(f"\n{cat_slug}: {len(all_ids)} total, {len(missing)} MISSING")
            # 获取缺失工具的前几个
            missing_batch = missing[:12]  # API 最多 12 个
            api_url = "https://aitools.fyi/api/tool/category-load-more"
            payload = {"toolIds": missing_batch}
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://aitools.fyi",
                "Referer": url,
            }
            resp2 = client.post(api_url, json=payload, headers=headers)
            if resp2.status_code == 200:
                tools = resp2.json()
                for t in tools[:3]:
                    print(f"  缺失工具: {t['name']} (ID: {t['id']}, 分类: {t.get('category', {}).get('slug')})")
            total_missing += len(missing)
        else:
            print(f"{cat_slug}: {len(all_ids)} total, 所有工具已采集 ✓")

print(f"\n总遗漏工具数: {total_missing}")

# 如果有遗漏，重新采集
if total_missing > 0:
    print("\n发现遗漏的工具，需要重新采集！")
else:
    print("\n所有工具均已采集，数据完整！")

client.close()