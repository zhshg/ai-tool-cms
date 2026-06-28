# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**请勿在公开 Issue 中报告安全漏洞。**

请通过以下方式私下报告：

1. GitHub Security Advisories：[Report a vulnerability](https://github.com/zhshg/ai-tool-cms/security/advisories/new)
2. 或发送邮件至：security@ai-tool-cms.local（请替换为你的安全联系邮箱）

我们会在 **72 小时内** 确认收到，并在 **7 个工作日内** 提供初步评估。

## 安全最佳实践

- 生产环境务必更换 `JWT_SECRET` 与所有默认密码
- 启用 HTTPS 与 CORS 白名单
- 定期运行 `pnpm audit` 与 Docker 镜像扫描
- 参考 `docs/security/SecurityChecklist.md`
