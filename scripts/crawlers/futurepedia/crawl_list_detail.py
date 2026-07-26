import json
import sys
sys.path.insert(0, r'f:\project\ai-tool-cms\scripts\crawlers')
from futurepedia.client import CrawlerClient, CrawlerConfig, CrawlerHttpError, NotFoundError
from futurepedia.discovery import BASE_URL, discover_categories, has_next_page, parse_tool_urls
from datetime import datetime
from urllib.parse import urlencode
import asyncio

async def main():
    exclude_file = r'f:\project\ai-tool-cms\storage\crawler\futurepedia\tools202607122254.json'
    exclude_slugs = set()
    
    try:
        with open(exclude_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get('items', []):
                exclude_slugs.add(item['slug'])
        print(f"已加载排除列表: {len(exclude_slugs)} 个已采集工具", flush=True)
    except Exception as e:
        print(f"加载排除列表失败: {e}", flush=True)
    
    config = CrawlerConfig(maxPages=200, delayMin=5.0, delayMax=10.0, timeout=60, retries=5)
    list_pages = []
    category_page_counts = {}
    detail_pages = []
    
    async with CrawlerClient(config) as client:
        print("开始获取分类列表", flush=True)
        response = await client.get_html(f"{BASE_URL}/ai-tools")
        categories = [item.slug for item in discover_categories(response.html)]
        print(f"发现 {len(categories)} 个分类", flush=True)
        
        for category in categories:
            print(f"处理分类: {category}", flush=True)
            page = 1
            page_count = 0
            
            while page <= 200:
                suffix = "" if page == 1 else "?" + urlencode({"page": page})
                list_url = f"{BASE_URL}/ai-tools/{category}{suffix}"
                
                try:
                    response = await client.get_html(list_url)
                    page_count += 1
                    list_pages.append(list_url)
                    
                    urls = parse_tool_urls(response.html)
                    print(f"  第{page}页: 发现 {len(urls)} 个工具", flush=True)
                    
                    for url in urls:
                        slug = url.rsplit('/', 1)[-1] if '/' in url else url
                        detail_pages.append({
                            "url": url,
                            "slug": slug,
                            "category": category,
                            "page": page,
                            "collected": slug in exclude_slugs
                        })
                    
                    if not has_next_page(response.html) or len(urls) == 0:
                        break
                    page += 1
                except NotFoundError:
                    break
                except CrawlerHttpError as e:
                    print(f"  获取失败: {e}", flush=True)
                    break
            
            category_page_counts[category] = page_count
            print(f"分类 {category} 共 {page_count} 页", flush=True)
    
    list_result = {
        "source": "futurepedia",
        "generatedAt": datetime.now().isoformat() + "Z",
        "total": len(list_pages),
        "categoryPageCounts": category_page_counts,
        "items": sorted(list_pages)
    }
    
    collected_count = sum(1 for item in detail_pages if item['collected'])
    new_count = len(detail_pages) - collected_count
    
    detail_result = {
        "source": "futurepedia",
        "generatedAt": datetime.now().isoformat() + "Z",
        "total": len(detail_pages),
        "collected": collected_count,
        "new": new_count,
        "items": detail_pages
    }
    
    list_output = r"f:\project\ai-tool-cms\scripts\crawlers\storage\crawler\futurepedia\list_pages.json"
    detail_output = r"f:\project\ai-tool-cms\scripts\crawlers\storage\crawler\futurepedia\detail_pages.json"
    
    with open(list_output, "w", encoding="utf-8") as f:
        json.dump(list_result, f, ensure_ascii=False, indent=2)
    
    with open(detail_output, "w", encoding="utf-8") as f:
        json.dump(detail_result, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== 完成 ===", flush=True)
    print(f"列表页: {len(list_pages)}", flush=True)
    print(f"详情页: {len(detail_pages)}", flush=True)
    print(f"  已采集: {collected_count}", flush=True)
    print(f"  未采集: {new_count}", flush=True)
    print(f"列表页文件: {list_output}", flush=True)
    print(f"详情页文件: {detail_output}", flush=True)

asyncio.run(main())
