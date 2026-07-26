import json
import time
from datetime import datetime
from urllib.parse import urlencode

import sys
sys.path.insert(0, r'f:\project\ai-tool-cms\scripts\crawlers')
from futurepedia.client import CrawlerClient, CrawlerConfig, CrawlerHttpError, NotFoundError
from futurepedia.discovery import BASE_URL, discover_categories, has_next_page, parse_tool_urls
import asyncio

config = CrawlerConfig(
    maxPages=200,
    concurrency=2,
    delayMin=5.0,
    delayMax=10.0,
    timeout=60,
    retries=5
)

list_pages = []
category_page_counts = {}

async def crawl():
    async with CrawlerClient(config) as client:
        print(f"[{datetime.now()}] 开始获取分类列表")
        try:
            response = await client.get_html(f"{BASE_URL}/ai-tools")
            categories = [item.slug for item in discover_categories(response.html)]
            print(f"[{datetime.now()}] 发现 {len(categories)} 个分类")
        except Exception as e:
            print(f"[{datetime.now()}] 获取分类列表失败: {e}")
            return
        
        for category in categories:
            print(f"[{datetime.now()}] 处理分类: {category}")
            page = 1
            page_count = 0
            
            while page <= config.maxPages:
                suffix = "" if page == 1 else "?" + urlencode({"page": page})
                url = f"{BASE_URL}/ai-tools/{category}{suffix}"
                
                try:
                    print(f"[{datetime.now()}]  获取列表页: {url}")
                    response = await client.get_html(url)
                    page_count += 1
                    list_pages.append(url)
                    
                    current = set(parse_tool_urls(response.html))
                    print(f"[{datetime.now()}]   发现 {len(current)} 个工具链接")
                    
                    if not has_next_page(response.html) or len(current) == 0:
                        break
                    
                    page += 1
                except NotFoundError:
                    print(f"[{datetime.now()}]   页面不存在，结束该分类")
                    break
                except CrawlerHttpError as e:
                    print(f"[{datetime.now()}]   获取失败: {e}")
                    break
                except Exception as e:
                    print(f"[{datetime.now()}]   异常: {e}")
                    break
            
            category_page_counts[category] = page_count
            print(f"[{datetime.now()}] 分类 {category} 共 {page_count} 页")
    
    result = {
        "source": "futurepedia",
        "generatedAt": datetime.now().isoformat() + "Z",
        "total": len(list_pages),
        "categoryPageCounts": category_page_counts,
        "items": sorted(list_pages)
    }
    
    output_path = r"f:\project\ai-tool-cms\scripts\crawlers\storage\crawler\futurepedia\list_pages.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n[{datetime.now()}] === 完成 ===")
    print(f"总列表页数: {len(list_pages)}")
    print(f"输出文件: {output_path}")

asyncio.run(crawl())
