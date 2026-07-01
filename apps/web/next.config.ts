import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneOutput = process.env.NEXT_STANDALONE === "true";

const nextConfig: NextConfig = {
  output: standaloneOutput ? "standalone" : undefined,
  outputFileTracingRoot: join(__dirname, "../.."),
  reactStrictMode: true,
  serverExternalPackages: [
    "@ai-tool-cms/database",
    "@ai-tool-cms/geo",
    "@ai-tool-cms/seo",
    "@prisma/client",
  ],
  transpilePackages: ["@ai-tool-cms/config"],
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
