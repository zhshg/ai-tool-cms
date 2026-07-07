# Server Release Consistency Checklist

## 目标

用于确认生产服务器上的发布目录、环境文件、镜像和容器状态是否一致，避免出现“本地有、服务器没有”或“代码已改但镜像没切”的问题。

## 使用时机

在以下场景执行：

1. 发布前
2. 重建失败后
3. 明显怀疑服务器代码树与本地不一致时
4. 新功能已提交但线上行为仍像旧版本时

## 一、目录一致性检查

在服务器执行：

```bash
cd /opt/ai-tool-cms
pwd
ls -la
git rev-parse --short HEAD
git status --short
```

检查要点：

- 当前目录是否正确
- 是否真的是目标项目目录
- 当前 commit 是否符合预期
- 是否存在未提交的服务器本地改动

## 二、关键文件存在性检查

重点确认以下文件是否存在：

```bash
cd /opt/ai-tool-cms
ls -l docker-compose.prod.yml
ls -l docker/Dockerfile.next
ls -l docker/Dockerfile.node
ls -l docker/nginx/conf.d/production.conf
ls -l .env.production
```

如果某次发布只同步了部分文件，也应额外检查本次变更文件。

## 三、workspace 结构一致性检查

用于排查 Dockerfile `COPY package.json` 失败。

```bash
cd /opt/ai-tool-cms
find apps -maxdepth 2 -name package.json | sort
find packages -maxdepth 2 -name package.json | sort
```

检查要点：

- 服务器真实存在的 `package.json` 是否与 Dockerfile 中 `COPY` 的清单一致
- 是否存在本地有但服务器目录缺失的 workspace

## 四、环境文件一致性检查

```bash
cd /opt/ai-tool-cms
grep -E '^(APP_URL|ADMIN_URL|API_URL|NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_API_URL|PNPM_REGISTRY|ADMIN_BASE_PATH)=' .env.production
```

检查要点：

- 域名相关变量是否正确
- `ADMIN_BASE_PATH` 是否符合当前路由策略
- `PNPM_REGISTRY` 是否已配置

## 五、镜像与容器一致性检查

```bash
docker images | grep ai-tool-cms
cd /opt/ai-tool-cms
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

检查要点：

- 新镜像是否真的构建出来
- 容器是否真的切到了新镜像
- 是否存在镜像更新了但容器没重建的情况

## 六、构建日志一致性检查

后台构建后，必须确认最终日志是否真正成功。

例如：

```bash
tail -n 80 /tmp/toolsdar-web-build.log
tail -n 80 /tmp/toolsdar-admin-build.log
tail -n 80 /tmp/toolsdar-api-build.log
```

检查要点：

- 是否出现 `Type error`
- 是否出现 `Failed to compile`
- 是否真正出现 `Image ... Built`

## 七、公开访问一致性检查

```bash
curl -I https://toolsdar.io/en
curl -I https://toolsdar.io/en/tools
curl -I https://toolsdar.io/en/categories
curl -I https://toolsdar.io/sitemaps/en.xml
curl -I https://api.toolsdar.io/v1/health
curl -I https://admins.toolsdar.io/
```

检查要点：

- 是否返回 `200`
- 页面行为是否与本次改动一致
- 是否仍像旧版本

## 八、判定标准

满足以下条件，才认为“服务器发布一致”：

1. 目标目录正确
2. 目标文件存在
3. workspace 结构与 Dockerfile 一致
4. `.env.production` 关键变量正确
5. 新镜像已生成
6. 容器已切换且为 `healthy`
7. 公开 URL 验收通过

## 九、发现不一致时的处理顺序

1. 先确认是不是目录错了
2. 再确认是不是文件没同步
3. 再确认是不是镜像没构建成功
4. 再确认是不是容器没重建
5. 最后才怀疑业务代码逻辑

## 相关文档

- [CurrentProductionRelease.md](./CurrentProductionRelease.md)
- [Runbook.md](./Runbook.md)
- [CleanReleaseDeployment.md](./CleanReleaseDeployment.md)
- [BuildFailureRootCauseAndFixPlan.md](./BuildFailureRootCauseAndFixPlan.md)
