import json

with open('f:/project/ai-tool-cms/storage/crawler/futurepedia/tools_remaining.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

items = data.get('items', [])
print(f'tools_remaining.json 工具总数: {len(items)}')
print('最后5个工具:')
for item in items[-5:]:
    print(f'  - {item["name"]}')
