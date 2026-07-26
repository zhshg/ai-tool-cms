import { loadRootDotenv } from "@ai-tool-cms/config";
import { prisma } from "../../prisma/seeds/context";
import { seedRolesAndPermissions } from "../../prisma/seeds/rbac";

const DEMO_RESET_FLAG = "ALLOW_DEMO_ADMIN_RESET";
const EXPECTED_EMAIL = "admin@ai-tool-cms.local";
const EXPECTED_PASSWORD = "Admin123!";

function assertDemoResetAllowed(): void {
  if (process.env[DEMO_RESET_FLAG] !== "true") {
    throw new Error(
      `Refusing to reset admin password without ${DEMO_RESET_FLAG}=true. This script is for local/demo use only.`,
    );
  }
}

async function main(): Promise<void> {
  loadRootDotenv();
  assertDemoResetAllowed();

  process.env.SEED_ADMIN_EMAIL = EXPECTED_EMAIL;
  process.env.SEED_ADMIN_PASSWORD = EXPECTED_PASSWORD;

  const result = await seedRolesAndPermissions();

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { id: result.adminUserId },
    include: {
      roles: {
        where: { deletedAt: null },
        include: {
          role: true,
        },
      },
    },
  });

  const roleCodes = adminUser.roles.map((item) => item.role.code).sort();

  console.info("[demo-admin-reset] Admin user is ready");
  console.info(`[demo-admin-reset] Email: ${adminUser.email}`);
  console.info(`[demo-admin-reset] Password: ${EXPECTED_PASSWORD}`);
  console.info(`[demo-admin-reset] Roles: ${roleCodes.join(", ") || "none"}`);
}

main()
  .catch((error) => {
    console.error("[demo-admin-reset] Failed to reset local admin user");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
