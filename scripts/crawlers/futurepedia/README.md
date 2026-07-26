# Futurepedia Python Crawler

独立运行的 Futurepedia 采集器。本阶段只输出 JSON，不连接数据库，也不会修改现有 Crawler、Worker、API 或 Admin。

## 安装

```bash
python -m pip install -r scripts/crawlers/requirements-futurepedia.txt
```

## 使用

单详情页：

```bash
python scripts/crawlers/futurepedia_crawler.py --detail-url https://www.futurepedia.io/tool/coralflavor --dry-run
```

限定分类和数量：

```bash
python scripts/crawlers/futurepedia_crawler.py --category writing-generators --max-tools 5 --max-pages 10 --dry-run
```

多个分类：

```bash
python scripts/crawlers/futurepedia_crawler.py --category image --category video --max-tools 50 --dry-run
```

断点恢复：

```bash
python scripts/crawlers/futurepedia_crawler.py --category writing-generators --resume --dry-run
```

默认输出到 `storage/crawler/futurepedia/`，包括 `tools.json`、`errors.json`、`checkpoint.json` 和 `report.json`。`--dry-run` 仍会生成这些审阅文件，但不会写数据库。传入 `--import-db` 会以退出码 2 明确拒绝执行。

默认并发为 2，请求间隔为 1.5 至 4 秒。采集器检查 robots.txt，不绕过登录、验证码、403 或其他明确访问限制。

详细步骤日志默认同时输出到终端和 `storage/crawler/futurepedia/crawler.log`。调试字段来源和重试等待可使用：

```bash
python scripts/crawlers/futurepedia_crawler.py --detail-url https://www.futurepedia.io/tool/coralflavor --dry-run --log-level debug
```

使用 `--log-file <path>` 修改 UTF-8 日志文件，使用 `--no-console-log` 仅写文件。日志文件达到 10 MB 后轮转，保留 5 份。
