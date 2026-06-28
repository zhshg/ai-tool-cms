# 监控指南

## 健康端点

| 端点 | 用途 | 预期 |
|------|------|------|
| `GET /v1/health/live` | Liveness | 200 |
| `GET /v1/health/ready` | Readiness (DB+Redis) | 200 |
| `GET /v1/health/metrics` | Prometheus | text/plain |

## Prometheus 指标

包：`@ai-tool-cms/monitoring`

关键指标（示例）：

- `http_request_duration_seconds` — API 延迟
- `process_cpu_seconds_total` — CPU
- `nodejs_heap_size_used_bytes` — 内存

### Scrape 配置

```yaml
scrape_configs:
  - job_name: ai-tool-cms-api
    static_configs:
      - targets: ["api:4000"]
    metrics_path: /v1/health/metrics
```

## 可观测性栈

| 组件 | 配置 |
|------|------|
| OpenTelemetry | `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Sentry | `SENTRY_DSN` |
| 日志 | 结构化 JSON via `@ai-tool-cms/logger` |

## 告警建议

| 告警 | 条件 | 动作 |
|------|------|------|
| API Down | ready 失败 > 2min | P0 on-call |
| High Latency | P95 > 1s 持续 5min | P1 |
| Queue Backlog | wait > 500 | Scale worker |
| Error Rate | 5xx > 1% | P1 |
| Backup Failed | cron 退出非 0 | P2 |

## Admin 仪表盘

- SEO Dashboard — 收录、404、Core Web Vitals（配置后）
- Growth Center — 流量与转化
- Crawler Dashboard — 采集健康度

## SEO 日报

Admin → SEO Dashboard 自动生成每日 SEO 健康快照（`seoHealthSnapshot` 表）。

## Grafana

导入 Prometheus 数据源后，可基于 `/v1/health/metrics` 自建面板。官方 Dashboard 计划 v1.1 提供。
