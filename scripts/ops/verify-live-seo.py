from __future__ import annotations

import argparse
import re
import urllib.request


DEFAULT_URLS = [
    "https://toolsdar.io/en/tools/marketalerts-ai",
    "https://toolsdar.io/zh-CN/tools/marketalerts-ai",
    "https://toolsdar.io/ja/search?q=GPTGO",
    "https://toolsdar.io/en/tools/gptgo",
]


def extract(pattern: str, html: str) -> list[str] | list[tuple[str, str]]:
    return re.findall(pattern, html, re.I)


def inspect_url(url: str) -> None:
    html = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "ignore")
    robots = extract(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', html)
    canonical = extract(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', html)
    hreflang = extract(
        r'<link[^>]+rel=["\']alternate["\'][^>]+hreflang=["\']([^"\']+)["\'][^>]+href=["\']([^"\']+)',
        html,
    )

    print(f"\nURL: {url}")
    print("robots:", robots[:1])
    print("canonical:", canonical[:1])
    print("hreflang_count:", len(hreflang))
    print("hreflang_sample:", hreflang[:12])


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify live SEO metadata for toolsdar pages.")
    parser.add_argument("urls", nargs="*", help="Specific URLs to verify.")
    args = parser.parse_args()

    urls = args.urls or DEFAULT_URLS
    for url in urls:
        inspect_url(url)


if __name__ == "__main__":
    main()
