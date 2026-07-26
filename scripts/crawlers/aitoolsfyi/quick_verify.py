"""快速验证 - 检查遗漏工具"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})

# 读取原始数据（含 id）
with open("storage/crawler/aitoolsfyi/tools_raw.json", "r", encoding="utf-8") as f:
    raw = json.load(f)

existing_ids = set(item["id"] for item in raw["items"])
print(f"已采集工具数（原始）: {len(existing_ids)}")

# 检查后面的分类
test_categories = [
    "ai-video-generation", "ai-data-science", "ai-audio-generation",
    "ai-design", "ai-writing-assistant", "ai-finance",
]

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
            print(f"\n{cat_slug}: {len(all_ids)} total, {len(missing)} MISSING IDs")
            # 获取前几个缺失工具
            batch = missing[:12]
            api_url = "https://aitools.fyi/api/tool/category-load-more"
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://aitools.fyi",
                "Referer": url,
            }
            resp2 = client.post(api_url, json={"toolIds": batch}, headers=headers)
            if resp2.status_code == 200:
                tools = resp2.json()
                for t in tools[:5]:
                    print(f"  缺失: {t['name']} (ID: {t['id']}, 分类: {t.get('category', {}).get('slug')})")
        else:
            print(f"{cat_slug}: {len(all_ids)} total, 全部已采集 ✓")

client.close()