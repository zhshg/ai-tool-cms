import { PrismaClient } from "@ai-tool-cms/database";
import { hashPassword } from "@ai-tool-cms/auth";

const prisma = new PrismaClient();

const ADMIN_DEFAULT_PASSWORD = "Admin@123";

const PERMISSIONS = [
  {
    name: "users:read",
    resource: "users",
    action: "read",
    description: "查看用户",
  },
  {
    name: "users:write",
    resource: "users",
    action: "write",
    description: "管理用户",
  },
  {
    name: "roles:read",
    resource: "roles",
    action: "read",
    description: "查看角色",
  },
  {
    name: "roles:write",
    resource: "roles",
    action: "write",
    description: "管理角色",
  },
] as const;

const ROLES = [
  {
    name: "admin",
    description: "系统管理员",
    permissions: PERMISSIONS.map((permission) => permission.name),
  },
  {
    name: "editor",
    description: "内容编辑",
    permissions: ["users:read", "roles:read"],
  },
] as const;

async function main() {
  const adminPasswordHash = await hashPassword(ADMIN_DEFAULT_PASSWORD);

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }

  for (const role of ROLES) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { name: { in: [...role.permissions] } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleId: createdRole.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: createdRole.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "admin" },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      displayName: "系统管理员",
      isActive: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      displayName: "系统管理员",
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
