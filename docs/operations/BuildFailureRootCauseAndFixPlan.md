# Build Failure Root Cause And Fix Plan

## 背景

`ai-tool-cms` 生产环境在重建 `admin`、`api`、`web`、`nginx` 时，曾多次出现以下现象：

- `docker compose build` 长时间卡住或 SSH 中断
- `pnpm install` 失败
- `docker build` 在 `COPY package.json` 或 `pnpm turbo run build` 阶段失败
- `admin` 容器已启动但 healthcheck 判定 `unhealthy`
- `nginx` 依赖上游容器健康状态，表面报错但并非首要根因

这份文档用于明确根因、区分代码问题与服务器问题，并固化后续标准操作。

## 根因结论

### 1. 部署链路问题，占比最高

这部分不是业务代码逻辑错误，而是生产构建方式本身不稳定。

- 旧版 Dockerfile 层顺序不合理
  - 只改前端样式也可能触发整层 `pnpm install`
  - 导致依赖重新下载概率过高
- 旧版 Dockerfile 使用的 pnpm 参数不稳定
  - 曾出现 `minTimeout is greater than maxTimeout`
  - 属于构建参数错误
- 服务器目录与本地工作区一度不完全一致
  - 本地有的 workspace，服务器发布目录里缺少对应 `package.json`
  - 导致 `COPY packages/.../package.json` 直接失败
- 之前缺少统一的后台构建方式
  - 前台 SSH 长连接容易被中断
  - 造成“看起来失败”，但实际构建可能仍在后台继续

### 2. 服务器网络问题，次要但高频

这部分不是代码问题，而是服务器到依赖源的网络环境问题。

- 构建时多次出现 `EAI_AGAIN`
- npm / pnpm registry 请求偶发失败
- 一旦 Docker cache 没复用成功，就容易重新暴露该问题

结论：

- 不是服务器算力不足为主
- 主要是服务器出网到依赖源不稳定

### 3. 前端严格构建暴露的小型代码问题

这部分属于代码问题，但不是架构级问题，都是可以逐项修复的小错误。

典型包括：

- Prisma 查询参数类型不兼容
  - `readonly` 数组传给 Prisma `in`
- 查询对象字段重复
  - 例如 `slug` 被重复声明
- 删除 UI 模块后残留未使用声明
  - 例如 `InternalLinkStrip`
  - 例如 `LinkCluster`

这类问题平时可能不明显，但生产 `Next.js` 严格构建会直接失败。

### 4. 健康检查与真实访问路径不一致

这部分属于部署配置问题。

- `admin` 曾经根路径实际可运行，但 healthcheck 检查了错误路径
- `ADMIN_BASE_PATH` 与 nginx 反代路径曾不一致
- 导致容器“业务上可启动”，但 Compose 判定 `unhealthy`

### 5. nginx 经常是表象，不是根因

- `nginx` 失败多数是因为它依赖的 `web/admin/api` 未通过 healthcheck
- 所以 `nginx` 常常不是首个故障点

## 分类判断

### 属于代码问题的部分

- `web` 严格构建报错
- 未使用声明导致的 TypeScript 失败
- Prisma 查询类型不兼容
- 页面组件删改后残留引用

### 属于部署配置问题的部分

- Dockerfile 依赖层顺序
- pnpm install 参数
- compose 的 build args
- `admin` healthcheck
- `ADMIN_BASE_PATH` 与 nginx 路由不一致

### 属于服务器环境问题的部分

- 依赖源网络抖动
- `EAI_AGAIN`
- 长时间前台 SSH 会话不稳定

## 已完成修复

截至当前，以下修复已经落地：

### Dockerfile

- `docker/Dockerfile.next`
  - 改为先复制 root/workspace `package.json`
  - 再执行 `pnpm install --frozen-lockfile`
  - 再复制完整源码
  - 增加 pnpm store cache mount
  - 调整超时配置，移除错误的 timeout 组合

- `docker/Dockerfile.node`
  - 同步采用相同的依赖缓存策略
  - 统一 `PNPM_REGISTRY` 传入方式

### Compose

- `docker-compose.prod.yml`
  - `api/web/admin/worker/scheduler/migrate/search-bootstrap` 统一支持 `PNPM_REGISTRY`
  - `admin` 的 `ADMIN_BASE_PATH` 改为可配置
  - `admin` healthcheck 改为检查 `/`

### 发布方式

- 改为优先使用后台构建
  - 日志写入 `/tmp/toolsdar-*.log`
  - 通过轮询日志判断成功与否
- 避免一直前台挂住 SSH 会话

### 前端构建问题

- 已修复多处 `web` 构建失败问题
  - 分类 slug 查询类型问题
  - 重复字段声明
  - 删除卡片组件后的残留未使用声明

## 仍需继续收口的问题

### 1. 服务器发布目录需要进一步标准化

当前仍存在风险：

- 生产目录可能与 Git 提交不完全一致
- 某些修复是通过单文件同步到服务器实现的

建议：

- 明确唯一发布目录：`/opt/ai-tool-cms`
- 每次发布前确认目录结构与本地提交一致
- 避免长期依赖“临时补一个文件”的方式

### 2. 仍需继续清理 strict build 错误

虽然本轮已经修掉多个 `web` 问题，但后续仍可能继续暴露：

- 未使用 import / function
- 类型收窄不完整
- admin 或 api 的严格构建问题

### 3. 服务器网络问题无法完全通过代码消除

可缓解，但不能彻底靠代码解决：

- 通过 Docker cache 减少下载次数
- 尽量避免无意义 rebuild
- 统一使用可达性更好的 registry

## 标准重建顺序

推荐以后统一按以下顺序操作。

### 1. 只改前台页面时

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build web
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps web nginx
```

### 2. 改后台管理页时

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build admin
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate admin nginx
docker compose --env-file .env.production -f docker-compose.prod.yml ps admin nginx
```

### 3. 改 API 时

```bash
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate api
docker compose --env-file .env.production -f docker-compose.prod.yml ps api
```

如 API 变更会影响前台或后台，再补：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate web admin nginx
```

## 推荐的后台构建方式

如果服务器 SSH 连接容易中断，优先用后台日志模式。

### web

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-web-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build web > /tmp/toolsdar-web-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-web-build.log
```

### admin

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-admin-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build admin > /tmp/toolsdar-admin-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-admin-build.log
```

### api

```bash
cd /opt/ai-tool-cms
rm -f /tmp/toolsdar-api-build.log
nohup docker compose --env-file .env.production -f docker-compose.prod.yml build api > /tmp/toolsdar-api-build.log 2>&1 < /dev/null &
tail -n 80 /tmp/toolsdar-api-build.log
```

## 回滚建议

如果新镜像已构建但上线后异常：

1. 先确认 `docker images` 中旧镜像 ID 还在
2. 优先回滚对应服务，不动数据库
3. 回滚后重新检查 `ps` 与公开 URL

如果需要正式回滚流程，参考：

- [Rollback.md](./Rollback.md)
- [ServerCleanupAndRollback.md](./ServerCleanupAndRollback.md)

## 下一步修复计划

建议按以下顺序继续：

1. 清理并固定生产发布目录结构
2. 为 `admin/api/web` 各补一份“真实访问路径 = healthcheck 路径”校验清单
3. 继续清理严格构建下暴露的 TS/ESLint 问题
4. 把“标准重建命令 + 后台构建日志命令 + 回滚命令”同步进主运维文档

## 结论

生产重建频繁失败，不是单一根因。

更准确的判断是：

- 主要是部署链路与发布方式问题
- 次要是服务器到依赖源网络不稳定
- 最后才是零散代码构建错误

因此后续修复策略应当是：

- 先稳定构建链路
- 再清理服务器发布目录
- 最后逐步清掉严格构建报错

这样才能把“每次重建像碰运气”变成“按固定步骤可重复成功”。
