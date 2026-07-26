"""捕获 Playwright 中的 API 请求"""
import json

from playwright.sync_api import sync_playwright


captured_requests = []

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = context.new_page()

        # 拦截 API 请求
        def handle_request(request):
            if "/api/tool/category-load-more" in request.url:
                captured_requests.append({
                    "url": request.url,
                    "method": request.method,
                    "headers": dict(request.headers),
                    "post_data": request.post_data,
                })
                print(f"Captured API request: {request.method} {request.url}")
                print(f"  Headers: {json.dumps(dict(request.headers), ensure_ascii=False)[:300]}")
                print(f"  Post data: {request.post_data}")

        page.on("request", handle_request)

        # 捕获响应
        captured_responses = []
        def handle_response(response):
            if "/api/tool/category-load-more" in response.url:
                try:
                    body = response.json()
                    captured_responses.append({
                        "url": response.url,
                        "status": response.status,
                        "body": body,
                    })
                    print(f"Captured API response: status={response.status}")
                    if isinstance(body, list):
                        print(f"  Tools count: {len(body)}")
                        if body:
                            print(f"  First tool: {json.dumps(body[0], ensure_ascii=False)[:300]}")
                    elif isinstance(body, dict):
                        print(f"  Response keys: {list(body.keys())}")
                except Exception as e:
                    print(f"Error parsing response: {e}")

        page.on("response", handle_response)

        url = "https://aitools.fyi/zh/category/ai-productivity"
        print(f"Loading {url}...")
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)

        # 点击加载更多
        btn = page.locator('button:has-text("加载更多")')
        if btn.count() > 0:
            print("\nClicking load more...")
            btn.first.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            btn.first.click()
            page.wait_for_timeout(3000)

            # 再点击一次
            btn2 = page.locator('button:has-text("加载更多")')
            if btn2.count() > 0:
                print("\nClicking load more again...")
                btn2.first.click()
                page.wait_for_timeout(3000)

        browser.close()

        # 保存捕获的数据
        with open("api_capture.json", "w", encoding="utf-8") as f:
            json.dump({
                "requests": captured_requests,
                "responses": captured_responses,
            }, f, ensure_ascii=False, indent=2)

        print(f"\n=== 捕获完成 ===")
        print(f"Requests: {len(captured_requests)}")
        print(f"Responses: {len(captured_responses)}")
        
        # 打印关键信息
        if captured_requests:
            print(f"\n关键 Headers:")
            req = captured_requests[0]
            important_headers = ["content-type", "accept", "origin", "referer", "x-requested-with", "cookie"]
            for h in important_headers:
                if h in req["headers"]:
                    val = req["headers"][h]
                    if h == "cookie":
                        val = val[:100] + "..." if len(val) > 100 else val
                    print(f"  {h}: {val}")


if __name__ == "__main__":
    main()