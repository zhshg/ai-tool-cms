import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneOutput = process.env.NEXT_STANDALONE === "true";
const configuredAdminBasePath = process.env.ADMIN_BASE_PATH?.trim();
const adminBasePath = configuredAdminBasePath
  ? configuredAdminBasePath
  : undefined;

const nextConfig: NextConfig = {
  output: standaloneOutput ? "standalone" : undefined,
  outputFileTracingRoot: join(__dirname, "../.."),
  basePath: adminBasePath,
  reactStrictMode: true,
  transpilePackages: ["@ai-tool-cms/config"],
};

export default nextConfig;
