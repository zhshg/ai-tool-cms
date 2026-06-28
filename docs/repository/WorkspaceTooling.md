# Workspace 工具链

Monorepo 共享配置，确保所有 Package 可通过 `workspace:*` 互相引用。

## TypeScript

- `tsconfig.base.json` — 全仓严格模式基础配置
- `tsconfig.json` — 根级 solution 引用各子项目
- 各 App 使用 `@/*` 路径别名指向本地 `src/`
- 共享包通过 `package.json` 的 `workspace:*` 依赖解析（`@ai-tool-cms/*`），无需手写 paths

`@repo/*` 为文档别名，运行时请使用 `@ai-tool-cms/*` 包名。

## ESLint

根目录 `eslint.config.mjs` 为 Flat Config，各 package 执行：

```bash
eslint src --config ../../eslint.config.mjs
```

## Prettier

```bash
pnpm format        # 格式化
pnpm format:check  # CI 检查
```

## Git Hooks

- **Husky** — `prepare` 脚本自动安装
- **lint-staged** — pre-commit 运行 Prettier

## 常用命令

```bash
pnpm setup:env     # 从 .env.example 生成 .env
pnpm dev:local     # 一键：Docker 基础设施 + web + api
pnpm dev:stack     # 仅并行启动 web + api
pnpm dev           # 启动所有 dev 任务
pnpm build         # 构建（Turbo 缓存）
pnpm lint          # ESLint
pnpm test          # Vitest
pnpm typecheck     # TypeScript 检查
pnpm docker:up     # 启动 Docker 基础设施
```
