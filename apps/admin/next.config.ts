import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneOutput = process.env.NEXT_STANDALONE === "true";
const adminBasePath = process.env.ADMIN_BASE_PATH || (process.env.NODE_ENV === "production" ? "/admin" : undefined);

const nextConfig: NextConfig = {
  output: standaloneOutput ? "standalone" : undefined,
  outputFileTracingRoot: join(__dirname, "../.."),
  basePath: adminBasePath,
  reactStrictMode: true,
  transpilePackages: ["@ai-tool-cms/config"],
};

export default nextConfig;
