# 事故响应

## 严重级别

| 级别 | 定义 | 响应时间 | 示例 |
|------|------|----------|------|
| P0 | 全站不可用 | 15 分钟 | API 全挂、数据丢失 |
| P1 | 核心功能受损 | 4 小时 | 发布失败、搜索不可用 |
| P2 | 非核心降级 | 24 小时 | 报表延迟、非关键 Admin 页 |
| P3 | 轻微问题 | 下一 Sprint | UI 瑕疵、文档错误 |

## 响应流程

```
检测 → 确认 → 分级 → 沟通 → 缓解 → 根因 → 复盘
```

1. **检测** — 监控告警、用户报告、值班巡检
2. **确认** — 复现问题，确认影响范围
3. **分级** — 指定 Incident Commander
4. **沟通** — 状态页 / 内部频道更新
5. **缓解** — Runbook 操作或回滚
6. **根因** — 5 Whys 分析
7. **复盘** — 72h 内 Postmortem（无责）

## P0 快速动作

```bash
# 回滚最近部署
kubectl rollout undo deployment/ai-tool-cms-api

# 或切换流量至上一版本
# 见 Rollback.md
```

## 沟通模板

```
[INCIDENT P0] AI Tool CMS API 不可用
开始时间：YYYY-MM-DD HH:MM UTC
影响：用户无法访问网站与 API
状态：调查中 / 已缓解 / 已解决
```

## 安全事件

遵循 [docs/security/IncidentResponse.md](../security/IncidentResponse.md)，**不要**在公开 Issue 讨论漏洞细节。

## 事后

- 更新 [RiskLog.md](../12-release/RiskLog.md)
- 补充 Runbook 缺口
- 添加回归测试
