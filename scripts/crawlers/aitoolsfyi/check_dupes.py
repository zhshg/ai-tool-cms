"""检查 tools_raw.json 中的重复数据"""
import json

with open("storage/crawler/aitoolsfyi/tools_raw.json", "r", encoding="utf-8") as f:
    data = json.load(f)

items = data["items"]
print(f"总条目数: {len(items)}")

# 检查 ID 重复
ids = [item["id"] for item in items if "id" in item]
unique_ids = set(ids)
print(f"唯一 ID 数: {len(unique_ids)}")
print(f"重复 ID 数: {len(ids) - len(unique_ids)}")

# 检查 slug 重复
slugs = [item["slug"] for item in items if "slug" in item]
unique_slugs = set(slugs)
print(f"唯一 slug 数: {len(unique_slugs)}")

# 检查是否有空 ID
null_ids = [item for item in items if "id" not in item or item["id"] is None]
print(f"空 ID 条目数: {len(null_ids)}")

# 检查 ID 为 0 的条目
zero_ids = [item for item in items if item.get("id") == 0]
print(f"ID 为 0 的条目数: {len(zero_ids)}")

# 统计分类
categories = {}
for item in items:
    cat = item.get("sourceCategory", "")
    if cat:
        categories[cat] = categories.get(cat, 0) + 1
print(f"\n分类统计 (前10):")
for cat, count in sorted(categories.items(), key=lambda x: -x[1])[:10]:
    print(f"  {cat}: {count}")