import asyncio
import sys
sys.path.insert(0, r'f:\project\ai-tool-cms\scripts\crawlers')
from futurepedia.client import CrawlerClient, CrawlerConfig
from futurepedia.discovery import BASE_URL

async def test():
    config = CrawlerConfig(delayMin=1, delayMax=2, timeout=30)
    async with CrawlerClient(config) as client:
        response = await client.get_html(BASE_URL)
        print('响应状态:', response.status_code)
        print('内容长度:', len(response.html.text))

asyncio.run(test())
