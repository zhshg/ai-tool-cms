# @ai-tool-cms/auth

认证与 RBAC 工具包。

## 功能

- `hashPassword` / `verifyPassword`（bcrypt，12 rounds）
- JWT Access / Refresh Token 签发与校验
- `PermissionCode` 常量与 seed 定义
- `hasPermission` / `hasRole` / `flattenPermissions`

## 使用

```typescript
import {
  hashPassword,
  signAccessToken,
  PermissionCode,
  hasPermission,
} from "@ai-tool-cms/auth";
```

NestJS API 通过 `JwtAuthGuard` + `@RequirePermission("tool:create")` 集成。
