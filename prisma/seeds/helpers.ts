import type { Prisma } from "@prisma/client";
import { prisma } from "./context";

export async function upsertBySlug<T extends { id: string }>(
  model: {
    findFirst: (args: { where: { slug: string; deletedAt: null } }) => Promise<T | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<T>;
    create: (args: { data: Record<string, unknown> }) => Promise<T>;
  },
  slug: string,
  createData: Record<string, unknown>,
  updateData: Record<string, unknown>,
): Promise<T> {
  const existing = await model.findFirst({
    where: { slug, deletedAt: null },
  });

  if (existing) {
    return model.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  return model.create({ data: { slug, ...createData } });
}

export async function upsertPermissionByCode(
  code: string,
  data: Prisma.PermissionCreateInput,
): Promise<{ id: string; code: string }> {
  const existing = await prisma.permission.findFirst({
    where: { code, deletedAt: null },
  });

  if (existing) {
    return prisma.permission.update({
      where: { id: existing.id },
      data: { ...data, deletedAt: null },
    });
  }

  return prisma.permission.create({ data });
}

export async function upsertRoleByCode(
  code: string,
  data: Prisma.RoleCreateInput,
): Promise<{ id: string; code: string }> {
  const existing = await prisma.role.findFirst({
    where: { code, deletedAt: null },
  });

  if (existing) {
    return prisma.role.update({
      where: { id: existing.id },
      data: { ...data, deletedAt: null },
    });
  }

  return prisma.role.create({ data });
}
