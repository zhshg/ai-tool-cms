import { Injectable, OnModuleInit } from "@nestjs/common";
import { registerBuiltinPlugins } from "@ai-tool-cms/plugins";
import { ensureDefaultWorkflows } from "@ai-tool-cms/workflow";
import { initObservability } from "@ai-tool-cms/observability";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class PlatformBootstrapService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    registerBuiltinPlugins();
    await initObservability("ai-tool-cms-api");
    await ensureDefaultWorkflows(this.prisma.client);
  }
}
