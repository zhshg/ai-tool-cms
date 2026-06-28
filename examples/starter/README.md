# Starter 示例

30 分钟部署验证脚本集合。

## 快速验证

```bash
# 从仓库根目录
./examples/starter/verify.sh
```

## 手动步骤

```bash
pnpm install
pnpm docker:up
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:stack
```

## 健康检查

```bash
curl -f http://localhost:4000/v1/health/ready
curl -s http://localhost:3000 | head -5
```

## 触发工作流（需 API 运行 + JWT）

```bash
# 示例：获取工具列表
curl http://localhost:4000/v1/tools -H "Authorization: Bearer $JWT"
```

## 环境

复制 `.env.example` 为 `.env`，至少配置 `DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`。
