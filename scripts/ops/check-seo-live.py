import re
import urllib.request

urls = [
  'https://toolsdar.io/en/tools/marketalerts-ai',
  'https://toolsdar.io/zh-CN/tools/marketalerts-ai',
  'https://toolsdar.io/ja/search?q=GPTGO',
  'https://toolsdar.io/en/tools/gptgo',
]
for url in urls:
    html = urllib.request.urlopen(url, timeout=30).read().decode('utf-8', 'ignore')
    robots = re.findall(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', html, re.I)
    canonical = re.findall(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', html, re.I)
    hreflang = re.findall(r'<link[^>]+rel=["\']alternate["\'][^>]+hreflang=["\']([^"\']+)["\'][^>]+href=["\']([^"\']+)', html, re.I)
    print('\nURL:', url)
    print('robots:', robots[:1])
    print('canonical:', canonical[:1])
    print('hreflang_count:', len(hreflang))
    print('hreflang_sample:', hreflang[:8])
