# Admin API Origin Fix Report

## 问题现象

Admin 浏览器侧登录请求仍然发往：

- `http://localhost:4000/v1/auth/login`

即使 `.env.production` 中 `NEXT_PUBLIC_API_URL` 已经不是 `http://localhost:4000`，并且 Admin 镜像已经重建，前端 bundle 里仍然保留了旧的 API fallback。

## 根因

这次问题不是单一源码逻辑错误，而是两段链路叠加：

1. [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)
   - 浏览器端 API 基址此前仍可能从非目标来源回退。
   - 本次收口后，浏览器端只读取 `NEXT_PUBLIC_API_URL`。
   - 若该值为空，则直接返回空字符串，让请求走相对路径 `/v1/...`。

2. [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next)
   - Next.js 客户端 bundle 在镜像构建阶段固化 `NEXT_PUBLIC_*` 变量。
   - 之前 `docker-compose.prod.yml` 没有把 `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` 显式作为 build args 传给 Next build。
   - 同时 builder 阶段存在复用旧 `apps/admin/.next` 与 `packages/config/dist` 产物的风险，导致源码已修复但最终 bundle 仍可能携带旧 `localhost:4000` fallback。

## 本次修复

### 1. 浏览器端 API base 收口

更新文件：

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)

修复后规则：

- 浏览器端仅使用 `NEXT_PUBLIC_API_URL`
- 如果 `NEXT_PUBLIC_API_URL` 为空，则返回 `""`
- 最终浏览器请求会变成：
  - `/v1/auth/login`
  - `/v1/auth/me`
  - `/v1/tools`
  - `/v1/categories`
  - `/v1/users`
  - `/v1/settings`

### 2. Next build 显式注入公开环境变量

更新文件：

- [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next)
- [docker-compose.prod.yml](F:\project\ai-tool-cms\docker-compose.prod.yml)

修复内容：

- 在 `docker-compose.prod.yml` 的 `web` 和 `admin` build args 中显式传入：
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_API_URL`
- 在 `docker/Dockerfile.next` 的 builder 阶段显式声明并导出：
  - `ARG NEXT_PUBLIC_APP_URL`
  - `ARG NEXT_PUBLIC_API_URL`
  - `ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}`
  - `ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}`

### 3. 清理旧构建产物，避免 bundle 污染

更新文件：

- [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next)

新增清理步骤：

```sh
RUN rm -rf apps/${APP_NAME}/.next packages/config/dist
```

目的：

- 防止旧的 `apps/admin/.next` chunk 被继续打包进镜像
- 防止旧的 `@ai-tool-cms/config/dist` 默认值继续进入客户端 bundle

## 受影响文件

- [apps/admin/src/lib/api.ts](F:\project\ai-tool-cms\apps\admin\src\lib\api.ts)
- [docker/Dockerfile.next](F:\project\ai-tool-cms\docker\Dockerfile.next)
- [docker-compose.prod.yml](F:\project\ai-tool-cms\docker-compose.prod.yml)

## 预期结果

重建后应满足：

- 生产 admin build 产物中不再包含 `localhost:4000`
- 浏览器 Network 登录请求变为：
  - `POST http://localhost/v1/auth/login`
- 登录成功后：
  - `/admin/tools`
  - `/admin/categories`
  - `/admin/users`
  - `/admin/settings`
  均通过 nginx 转发到 API，返回真实数据

## 验证步骤

建议使用以下命令进行验证：

```bash
pnpm lint
pnpm typecheck
docker compose --env-file .env.production -f docker-compose.prod.yml build admin --no-cache
docker compose --env-file .env.production -f docker-compose.prod.yml up -d admin nginx
```

然后确认：

1. 浏览器 Network 中登录 URL 为 `http://localhost/v1/auth/login`
2. 返回内容为 JSON，而不是 Admin 404 HTML
3. 登录 `admin@ai-tool-cms.local / Admin123!` 成功
4. `Tools / Categories / Users / Settings` 页面返回 `200`

## 风险说明

- 如果本机 Docker 层缓存或旧容器未替换，仍可能看到旧 bundle，需要使用 `--no-cache` 重建并刷新容器。
- 当前仓库还有未跟踪文档文件，与本次修复无关，不应误提交。
