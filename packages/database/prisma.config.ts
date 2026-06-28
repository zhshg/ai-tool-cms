import { defineConfig } from "prisma/config";
import { loadRootDotenv } from "@ai-tool-cms/config";

loadRootDotenv();

export default defineConfig({
  schema: "../../prisma/schema.prisma",
});
