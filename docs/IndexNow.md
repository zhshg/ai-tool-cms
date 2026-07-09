# IndexNow

## Key 文件

- 动态方案：`apps/web/src/app/[indexNowKey].txt/route.ts` 会读取 `INDEXNOW_KEY`，并在访问 `https://toolsdar.io/{INDEXNOW_KEY}.txt` 时返回纯文本 key。
- 静态兜底：部署时也可以手动放置 `apps/web/public/{INDEXNOW_KEY}.txt`，文件内容只保留 key 本身。
- 安全要求：不要把真实 key 提交到 GitHub。根目录 `.gitignore` 已忽略 `apps/web/public/*.txt`。

## 生产环境变量

- `INDEXNOW_ENABLED=true`
- `INDEXNOW_KEY=`
- `INDEXNOW_KEY_LOCATION=`
- `INDEXNOW_ENDPOINT=https://api.indexnow.org/indexnow`
- `SITE_URL=https://toolsdar.io`
