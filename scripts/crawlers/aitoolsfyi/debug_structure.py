"""调试 aitools.fyi 页面结构"""
import httpx
from bs4 import BeautifulSoup

client = httpx.Client(timeout=30, follow_redirects=True)
client.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

resp = client.get("https://aitools.fyi/zh/category/ai-productivity")
soup = BeautifulSoup(resp.text, "lxml")

# 找第一个 h2，然后向上查找到卡片容器
h2 = soup.select_one("h2")
print("=== H2 的父元素 ===")
parent = h2.parent
print(f"Parent tag: {parent.name}")
print(f"Parent class: {parent.get('class')}")

# 向上找2层
grandparent = parent.parent
print(f"Grandparent tag: {grandparent.name}")
print(f"Grandparent class: {grandparent.get('class')}")

# 打印 grandparent 的 HTML
print()
print("=== Grandparent HTML (前3000字符) ===")
html_str = str(grandparent)
print(html_str[:3000])

# 查找外部链接
print()
print("=== 查找所有外部链接 ===")
for a in grandparent.select("a[href]"):
    href = a.get("href", "")
    text = a.get_text(" ", strip=True)
    if href.startswith("http") and "aitools.fyi" not in href:
        print(f"  外部链接: {text[:50]} -> {href[:100]}")

# 检查分页
print()
print("=== 分页检查 ===")
# 查找 "加载更多" 按钮
load_more = soup.select_one('button:contains("加载更多"), a:contains("加载更多"), [data-testid*="load"]')
print(f"Load more button found: {load_more is not None}")

# 查找 data 属性中的分页信息
scripts = soup.select("script")
for script in scripts:
    text = script.string
    if text and ("page" in text.lower() or "next" in text.lower() or "cursor" in text.lower()):
        print(f"Found pagination script: {text[:500]}...")
        break

client.close()