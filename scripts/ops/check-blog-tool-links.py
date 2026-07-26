import re
import urllib.request

URLS = [
    "https://toolsdar.io/en/blog/2026-07-21-education-ai-tools-guide",
    "https://toolsdar.io/en/blog/2026-07-21-startup-tools-ai-tools-guide",
]

for url in URLS:
    html = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "ignore")
    links = sorted(set(re.findall(r'href=["\'](/en/tools/[^"\']+)["\']', html)))
    print(f"\nURL: {url}")
    print("tool_links_count:", len(links))
    print("tool_links_sample:", links[:12])
