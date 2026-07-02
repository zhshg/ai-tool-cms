import { PrismaClient } from "../../packages/database/generated/client";
import { loadRootDotenv } from "@ai-tool-cms/config";

loadRootDotenv();

export const prisma = new PrismaClient();

export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ai-tool-cms.local";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
