"""分析采集结果"""
import json
from collections import Counter

with open("storage/crawler/aitoolsfyi/tools_raw.json", "r", encoding="utf-8") as f:
    data = json.load(f)

items = data["items"]
print(f"总工具数: {len(items)}")

# 按 sourceCategory 统计
source_cats = Counter(item["sourceCategory"] for item in items)
print(f"\n来源分类分布:")
for cat, count in source_cats.most_common(20):
    print(f"  {cat}: {count}")

# 按 pricingType 统计
pricing = Counter(item["pricingType"] for item in items)
print(f"\n价格模型分布:")
for p, count in pricing.most_common():
    print(f"  {p}: {count}")

# 检查是否有重复的 slug
slugs = [item["slug"] for item in items]
unique_slugs = set(slugs)
print(f"\n唯一 slug 数: {len(unique_slugs)}")
print(f"重复 slug 数: {len(slugs) - len(unique_slugs)}")

# 检查是否有重复的 id
ids = [item["id"] for item in items]
unique_ids = set(ids)
print(f"唯一 ID 数: {len(unique_ids)}")
print(f"重复 ID 数: {len(ids) - len(unique_ids)}")

# 检查有 zhDescription 的工具
has_zh = sum(1 for item in items if item.get("zhDescription"))
print(f"\n有中文描述的工具: {has_zh}/{len(items)} ({has_zh/len(items)*100:.1f}%)")

# 检查有 description 的工具
has_desc = sum(1 for item in items if item.get("description"))
print(f"有英文描述的工具: {has_desc}/{len(items)} ({has_desc/len(items)*100:.1f}%)")

# 检查 website 是否有效
has_website = sum(1 for item in items if item.get("website"))
print(f"有网站链接的工具: {has_website}/{len(items)} ({has_website/len(items)*100:.1f}%)")

# 检查被标记为广告的工具
ads = sum(1 for item in items if item.get("isAd"))
print(f"广告工具: {ads}/{len(items)}")

# 统计平均描述长度
desc_lengths = [len(item.get("description", "")) for item in items]
zh_lengths = [len(item.get("zhDescription", "")) for item in items if item.get("zhDescription")]
print(f"\n英文描述平均长度: {sum(desc_lengths)/len(desc_lengths):.0f} 字符")
if zh_lengths:
    print(f"中文描述平均长度: {sum(zh_lengths)/len(zh_lengths):.0f} 字符")

# 示例工具
print("\n前5个工具示例:")
for item in items[:5]:
    print(f"  {item['name']} ({item['slug']}) - {item['pricingType']} - {item['sourceCategory']}")