import type { Permission } from "@prisma/client";
import {
  ADMIN_ROLE_CODE,
  EDITOR_ROLE_CODE,
  PERMISSION_DEFINITIONS,
  PermissionCode,
  VIEWER_ROLE_CODE,
  hashPassword,
} from "@ai-tool-cms/auth";
import { prisma, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from "./context";
import { upsertPermissionByCode, upsertRoleByCode } from "./helpers";

export async function seedRolesAndPermissions(): Promise<{
  adminUserId: string;
  permissions: Permission[];
}> {
  const permissions: Permission[] = [];

  for (const definition of PERMISSION_DEFINITIONS) {
    const permission = await upsertPermissionByCode(definition.code, {
      slug: definition.slug,
      code: definition.code,
      name: definition.name,
      module: definition.module,
    });
    permissions.push(permission as Permission);
  }

  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  const adminRole = await upsertRoleByCode(ADMIN_ROLE_CODE, {
    slug: ADMIN_ROLE_CODE,
    code: ADMIN_ROLE_CODE,
    name: "Administrator",
    description: "Full system access",
    isSystem: true,
  });

  const editorRole = await upsertRoleByCode(EDITOR_ROLE_CODE, {
    slug: EDITOR_ROLE_CODE,
    code: EDITOR_ROLE_CODE,
    name: "Editor",
    description: "Content editor",
    isSystem: true,
  });

  const viewerRole = await upsertRoleByCode(VIEWER_ROLE_CODE, {
    slug: VIEWER_ROLE_CODE,
    code: VIEWER_ROLE_CODE,
    name: "Viewer",
    description: "Read-only access",
    isSystem: true,
  });

  const allPermissionIds = permissions.map((permission) => permission.id);
  const editorCodes = [
    PermissionCode.DashboardView,
    PermissionCode.ToolRead,
    PermissionCode.ToolCreate,
    PermissionCode.ToolUpdate,
    PermissionCode.CategoryRead,
    PermissionCode.CategoryCreate,
    PermissionCode.CategoryUpdate,
    PermissionCode.TagRead,
    PermissionCode.TagCreate,
    PermissionCode.TagUpdate,
    PermissionCode.CrawlerRead,
    PermissionCode.CrawlerRun,
    PermissionCode.AiRead,
    PermissionCode.AiManage,
    PermissionCode.SeoRead,
    PermissionCode.SeoManage,
    PermissionCode.SearchRead,
    PermissionCode.AnalyticsRead,
  ];
  const viewerCodes = [
    PermissionCode.DashboardView,
    PermissionCode.ToolRead,
    PermissionCode.CategoryRead,
    PermissionCode.TagRead,
    PermissionCode.CrawlerRead,
  ];

  await syncRolePermissions(adminRole.id, allPermissionIds);
  await syncRolePermissions(
    editorRole.id,
    editorCodes.map((code) => permissionByCode.get(code)!.id),
  );
  await syncRolePermissions(
    viewerRole.id,
    viewerCodes.map((code) => permissionByCode.get(code)!.id),
  );

  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);
  const adminUser = await prisma.user.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {
      passwordHash,
      displayName: "System Admin",
      slug: "admin",
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      displayName: "System Admin",
      slug: "admin",
      status: "ACTIVE",
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    update: { deletedAt: null },
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  return { adminUserId: adminUser.id, permissions };
}

async function syncRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: { deletedAt: null },
      create: { roleId, permissionId },
    });
  }
}
