"""快速测试 Playwright 爬虫"""
import json
import re
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = context.new_page()

        url = "https://aitools.fyi/zh/category/ai-productivity"
        print(f"Loading {url}...")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)

        # 检查加载更多按钮
        html = page.content()
        soup = BeautifulSoup(html, "lxml")

        buttons = soup.select("button")
        for btn in buttons:
            text = btn.get_text(" ", strip=True)
            if "加载" in text or "更多" in text or "load" in text.lower() or "more" in text.lower():
                print(f"Found button: '{text}'")

        # 统计工具
        h2s = soup.select("h2")
        tool_count = sum(1 for h2 in h2s if h2.parent and h2.parent.name == "a")
        print(f"Initial tool count: {tool_count}")

        # 点击加载更多
        btn = page.locator('button:has-text("加载更多")')
        if btn.count() > 0:
            print("Clicking load more...")
            btn.first.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            btn.first.click()
            page.wait_for_timeout(3000)

            html2 = page.content()
            soup2 = BeautifulSoup(html2, "lxml")
            tool_count2 = sum(1 for h2 in soup2.select("h2") if h2.parent and h2.parent.name == "a")
            print(f"After click: {tool_count2} tools")
            
            # 再点击一次
            btn2 = page.locator('button:has-text("加载更多")')
            if btn2.count() > 0:
                print("Clicking load more again...")
                btn2.first.click()
                page.wait_for_timeout(3000)
                html3 = page.content()
                soup3 = BeautifulSoup(html3, "lxml")
                tool_count3 = sum(1 for h2 in soup3.select("h2") if h2.parent and h2.parent.name == "a")
                print(f"After 2 clicks: {tool_count3} tools")
        else:
            print("No load more button found")

        # 检查 __NEXT_DATA__ 是否更新
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if match:
            data = json.loads(match.group(1))
            pp = data.get("props", {}).get("pageProps", {})
            next_tools = pp.get("tools", [])
            print(f"__NEXT_DATA__ tools: {len(next_tools)}")
            cat = pp.get("category", {})
            cat_tools = cat.get("tools", [])
            print(f"Category total tools: {len(cat_tools)}")

        browser.close()


if __name__ == "__main__":
    main()