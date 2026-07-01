import { defineConfig } from "prisma/config";
import { loadRootDotenv } from "@ai-tool-cms/config/load-dotenv";

loadRootDotenv();

export default defineConfig({
  schema: "../../prisma/schema.prisma",
  migrations: {
    seed: "tsx ../../prisma/seed.ts",
  },
});
