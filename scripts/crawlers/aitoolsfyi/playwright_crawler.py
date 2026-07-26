"""Playwright 爬虫 - 从分类页加载所有工具"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("需要安装 playwright: pip install playwright && playwright install chromium")
    sys.exit(1)


OUTPUT_DIR = Path("storage/crawler/aitoolsfyi")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = [
    "ai-productivity", "ai-image-generation", "ai-code-assistant",
    "ai-chat-bot", "ai-marketing", "ai-education",
    "ai-web-apps", "ai-analytics", "ai-social-media-assistant",
    "ai-shopify-apps", "ai-sales", "ai-web3",
    "ai-assistant", "ai-gaming", "ai-image-editing",
    "ai-copywriting", "ai-model-generation", "ai-healthcare",
    "ai-summarizer", "ai-photo-editing", "ai-avatar-generation",
    "ai-fun-tools", "ai-image-generation-model", "ai-presentation",
    "ai-customer-support", "ai-content-creation", "ai-companion",
    "ai-research", "ai-email-assistant", "ai-search-engine",
    "ai-sql-query", "ai-noise-cancellation", "ai-human-resource",
    "ai-news", "ai-e-commerce", "ai-legal",
    "ai-paraphraser", "ai-video-editing", "ai-all-in-one",
    "ai-automation", "ai-3d-generation", "ai-hosting",
    "ai-finance", "ai-large-language-model", "ai-branding",
    "ai-nsfw", "ai-resume", "ai-travel",
    "ai-translation", "ai-developer", "ai-excel",
    "ai-real-estate", "ai-medical-assistant", "ai-ai-detection",
    "ai-nudity", "ai-astrology", "ai-dating",
    "ai-anime-generator", "ai-text-to-speech-tts", "ai-homework",
    "ai-stock-market", "ai-ai-girlfriend", "ai-agents",
    "ai-directories", "ai-kids", "ai-fashion",
    "ai-physical-products", "ai-web-scraping", "ai-text-generation",
    "ai-pdf", "ai-writing-assistant", "ai-meeting-assistant",
    "ai-video-generation", "ai-data-science", "ai-project-management",
    "ai-audio-generation", "ai-design",
]


def extract_tools_from_page(html: str) -> list[dict]:
    """从页面 HTML 提取工具数据"""
    tools = []
    
    # 方法1: 从 __NEXT_DATA__ 提取
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
    if match:
        try:
            data = json.loads(match.group(1))
            pp = data.get("props", {}).get("pageProps", {})
            
            # 提取页面上已加载的工具
            page_tools = pp.get("tools", [])
            for tool in page_tools:
                tools.append({
                    "id": tool.get("id"),
                    "slug": tool.get("slug"),
                    "name": tool.get("name"),
                    "website": tool.get("website"),
                    "description": tool.get("description", ""),
                    "logoUrl": tool.get("logoUrl"),
                    "pricingType": tool.get("pricingType"),
                    "isAd": tool.get("isAd", False),
                    "category": tool.get("category"),
                })
        except json.JSONDecodeError:
            pass
    
    # 方法2: 从 DOM 解析额外的工具（加载更多后 __NEXT_DATA__ 可能不更新）
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    
    # 查找所有 h2 工具标题
    for h2 in soup.select("h2"):
        parent = h2.parent
        if parent and parent.name == "a":
            href = parent.get("href", "")
            if href.startswith("http") and "aitools.fyi" not in href:
                # 这是一个工具链接
                name = h2.get_text(" ", strip=True)
                # 检查是否已添加
                if not any(t["name"] == name for t in tools):
                    # 尝试找更多信息
                    grandparent = parent.parent
                    description = ""
                    logoUrl = None
                    if grandparent:
                        desc_p = grandparent.find_next("p")
                        if desc_p:
                            description = desc_p.get_text(" ", strip=True)
                        img = grandparent.select_one("img[src]")
                        if img:
                            logoUrl = img.get("src")
                    
                    tools.append({
                        "id": None,
                        "slug": None,
                        "name": name,
                        "website": href,
                        "description": description,
                        "logoUrl": logoUrl,
                        "pricingType": None,
                        "isAd": False,
                        "category": None,
                    })
    
    return tools


def crawl_category(page, category_slug: str, max_load_more: int = 100) -> list[dict]:
    """爬取单个分类的所有工具"""
    url = f"https://aitools.fyi/zh/category/{category_slug}"
    print(f"  爬取分类: {category_slug}")
    
    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
    except Exception as e:
        print(f"    页面加载超时: {e}")
        # 尝试继续
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
        except:
            return []
    
    # 先提取初始页面的工具
    html = page.content()
    tools = extract_tools_from_page(html)
    initial_count = len(tools)
    print(f"    初始加载: {initial_count} 个工具")
    
    # 循环点击"加载更多"
    load_more_clicks = 0
    previous_count = initial_count
    
    for _ in range(max_load_more):
        # 查找"加载更多"按钮
        load_more_btn = page.locator('button:has-text("加载更多"), a:has-text("加载更多"), [class*="load-more"], [data-testid*="load"]')
        
        if load_more_btn.count() == 0:
            print(f"    没有更多加载按钮，停止")
            break
        
        try:
            # 滚动到按钮位置
            load_more_btn.first.scroll_into_view_if_needed(timeout=3000)
            page.wait_for_timeout(500)
            
            # 点击按钮
            load_more_btn.first.click(timeout=5000)
            load_more_clicks += 1
            
            # 等待新内容加载
            page.wait_for_timeout(1500)
            
            # 提取当前页面的工具
            html = page.content()
            new_tools = extract_tools_from_page(html)
            
            if len(new_tools) == previous_count:
                # 没有新工具，可能已到底
                # 再试一次确认
                page.wait_for_timeout(1000)
                html = page.content()
                new_tools2 = extract_tools_from_page(html)
                if len(new_tools2) == previous_count:
                    print(f"    没有更多新工具，停止")
                    tools = new_tools
                    break
            
            tools = new_tools
            previous_count = len(tools)
            
        except Exception as e:
            print(f"    点击加载更多失败: {e}")
            break
    
    print(f"    加载 {load_more_clicks} 次后，共 {len(tools)} 个工具")
    return tools


def main():
    print("=== aitools.fyi Playwright 爬虫 ===")
    print(f"共 {len(CATEGORIES)} 个分类待爬取")
    
    all_tools = []
    seen_slugs = set()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = context.new_page()
        
        for i, category_slug in enumerate(CATEGORIES):
            print(f"\n[{i+1}/{len(CATEGORIES)}] 处理: {category_slug}")
            
            try:
                tools = crawl_category(page, category_slug)
                
                # 去重添加
                new_count = 0
                for tool in tools:
                    slug = tool.get("slug") or tool.get("name", "").lower().replace(" ", "-")
                    if slug not in seen_slugs:
                        seen_slugs.add(slug)
                        tool["source_category"] = category_slug
                        all_tools.append(tool)
                        new_count += 1
                
                print(f"    新增: {new_count}, 累计: {len(all_tools)}")
                
                # 每10个分类保存一次
                if (i + 1) % 10 == 0:
                    output_file = OUTPUT_DIR / "tools_partial.json"
                    with open(output_file, "w", encoding="utf-8") as f:
                        json.dump({
                            "source": "aitoolsfyi",
                            "generatedAt": datetime.now(timezone.utc).isoformat() + "Z",
                            "total": len(all_tools),
                            "items": all_tools,
                        }, f, ensure_ascii=False, indent=2)
                    print(f"    已保存到 {output_file}")
                    
            except Exception as e:
                print(f"    错误: {e}")
                continue
        
        browser.close()
    
    # 保存最终结果
    output_file = OUTPUT_DIR / "tools_raw.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "source": "aitoolsfyi",
            "generatedAt": datetime.now(timezone.utc).isoformat() + "Z",
            "total": len(all_tools),
            "items": all_tools,
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n=== 完成 ===")
    print(f"共采集 {len(all_tools)} 个独立工具")
    print(f"保存到: {output_file}")


if __name__ == "__main__":
    main()