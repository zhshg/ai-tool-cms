# 贡献指南

感谢参与 AI Tool CMS 开源社区！

## 开发流程

1. Fork 仓库
2. 创建分支：`cursor/<feature>-c760` 或 `feature/<name>`
3. 提交 PR 至 `main`（或当前 Sprint 集成分支）
4. 确保 CI 通过：`lint` · `typecheck` · `test` · `build`

## 代码规范

- TypeScript strict
- ESLint + Prettier（`pnpm format`）
- 见 [docs/00-project/CodingStandards.md](./00-project/CodingStandards.md)

## Commit 规范

```
<type>(<scope>): <description>

类型：feat | fix | docs | chore | test | refactor | release
```

## 测试

```bash
pnpm test              # 单元 + 集成
pnpm test:e2e          # E2E（需 dev:stack）
```

## PR 检查清单

- [ ] 变更范围最小化
- [ ] 无新增 secrets
- [ ] 文档已更新（如适用）
- [ ] 测试已添加或更新

## 报告问题

- Bug：[Bug Report 模板](../.github/ISSUE_TEMPLATE/bug_report.md)
- 功能请求：[Feature Request 模板](../.github/ISSUE_TEMPLATE/feature_request.md)
- 安全：[SECURITY.md](../.github/SECURITY.md)

## 行为准则

见 [CODE_OF_CONDUCT.md](../.github/CODE_OF_CONDUCT.md)

## 获取支持

见 [SUPPORT.md](../.github/SUPPORT.md)
