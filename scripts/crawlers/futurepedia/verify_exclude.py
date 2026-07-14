import json

exclude_data = json.load(open('f:/project/ai-tool-cms/storage/crawler/futurepedia/tools202607122254.json', 'r', encoding='utf-8'))
exclude_slugs = {item['slug'] for item in exclude_data.get('items', [])}

checkpoint = json.load(open('f:/project/ai-tool-cms/storage/crawler/futurepedia/checkpoint.json', 'r', encoding='utf-8'))
processed_urls = checkpoint['processedUrls']

excluded_count = 0
for url in processed_urls:
    slug = url.rsplit('/', 1)[-1] if '/' in url else url
    if slug in exclude_slugs:
        excluded_count += 1

print(f'已处理URL总数: {len(processed_urls)}')
print(f'其中属于排除列表的: {excluded_count}')
print(f'新采集的工具数(savedCount): {checkpoint["savedCount"]}')
print(f'已处理URL - 排除数量 = {len(processed_urls) - excluded_count}')

remaining_data = json.load(open('f:/project/ai-tool-cms/storage/crawler/futurepedia/tools_remaining.json', 'r', encoding='utf-8'))
remaining_slugs = {item['slug'] for item in remaining_data.get('items', [])}
overlap = remaining_slugs & exclude_slugs
print(f'tools_remaining与排除列表重复数: {len(overlap)}')
if overlap:
    print(f'重复示例: {list(overlap)[:5]}')
