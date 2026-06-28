#!/usr/bin/env node
import { getEnv } from "@ai-tool-cms/config";
import { connectPrisma, disconnectPrisma, prisma } from "@ai-tool-cms/database";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  getEnv();
  await connectPrisma();

  const server = createMcpServer(prisma);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async (signal: string) => {
    process.stderr.write(`ai-tool-cms-mcp shutting down (${signal})\n`);
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ai-tool-cms-mcp failed: ${message}\n`);
  process.exit(1);
});
