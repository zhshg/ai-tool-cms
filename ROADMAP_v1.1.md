# Roadmap v1.1

**Target:** Post-GA incremental release  
**Theme:** AI Operations & Growth

## 重点功能

### AI Agent Dashboard
- 统一 AI 任务监控：生成、审核、重试、成本
- Agent 会话历史与 Prompt 追踪

### Prompt Library
- 可视化 Prompt 目录管理
- 版本化、A/B 测试、多语言 Prompt 变体

### Plugin Marketplace
- 社区插件发现与一键安装
- 插件签名与沙箱执行

### 更多 AI Provider
- Google Gemini、Mistral、本地 Ollama
- Provider 路由与 fallback 策略

### 内容质量优化
- 自动化质量门禁阈值配置
- 薄内容检测与批量修复建议

### 更强 Analytics
- 漏斗分析、留存、工具详情页热力图
- Grafana 官方 Dashboard 模板

## 技术债清理

- Public API 路径标准化（网关 `/api/v1/*`）
- Redis 分布式限流
- GSC / Bing API 完整客户端
- 单元测试覆盖率 ≥ 90%

## 非目标（v1.1）

- 可视化 Workflow Builder（留 v2.0）
- 多租户 SaaS

## 时间线

按功能优先级迭代发布 `1.1.0` → `1.1.x` patch releases。
