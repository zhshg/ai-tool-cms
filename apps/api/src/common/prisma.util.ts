import type { Prisma } from "@ai-tool-cms/database";

export const activeOnly = { deletedAt: null } as const;

export function notFound(entity: string): never {
  throw new Error(`${entity} not found`);
}

export function toJsonObject(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
