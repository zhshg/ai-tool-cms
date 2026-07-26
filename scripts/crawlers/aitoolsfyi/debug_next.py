"""解析 aitools.fyi 的 Next.js SSR 数据"""
import json
import re

import httpx


client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
html = resp.text

# 提取 __NEXT_DATA__
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
if match:
    data = json.loads(match.group(1))
    print("=== __NEXT_DATA__ 顶层键 ===")
    print(list(data.keys()))

    props = data.get("props", {})
    page_props = props.get("pageProps", {})
    print(f"\npageProps 键: {list(page_props.keys())}")

    # 查找工具列表
    for key, value in page_props.items():
        if isinstance(value, list) and len(value) > 0:
            print(f"\n列表字段 '{key}': {len(value)} 项")
            if isinstance(value[0], dict):
                print(f"  第一项的键: {list(value[0].keys())}")
                # 打印第一项的简要信息
                first = value[0]
                summary = {}
                for k in ["name", "slug", "website", "description", "pricing", "rating"]:
                    if k in first:
                        val = first[k]
                        if isinstance(val, str) and len(val) > 100:
                            val = val[:100] + "..."
                        summary[k] = val
                print(f"  第一项摘要: {json.dumps(summary, ensure_ascii=False)}")
        elif isinstance(value, dict):
            print(f"\n字典字段 '{key}': {list(value.keys())[:10]}")

    # 检查分页信息
    if "page" in data:
        print(f"\ndata.page: {data['page']}")
    if "query" in data:
        print(f"data.query: {data['query']}")

    # 查看是否有分页游标
    if "pageProps" in data:
        pp = data["pageProps"]
        for k, v in pp.items():
            if "page" in str(k).lower() or "next" in str(k).lower() or "cursor" in str(k).lower() or "total" in str(k).lower() or "count" in str(k).lower():
                print(f"\n分页相关字段 '{k}': {v}")
else:
    print("未找到 __NEXT_DATA__")

client.close()