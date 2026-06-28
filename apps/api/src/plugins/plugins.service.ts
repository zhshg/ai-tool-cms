import { Injectable } from "@nestjs/common";
import { listPlugins } from "@ai-tool-cms/plugins";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PluginsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async listRegistrations() {
    const [dbPlugins, runtimePlugins] = await Promise.all([
      this.db.pluginRegistration.findMany({
        where: { deletedAt: null },
        orderBy: { module: "asc" },
      }),
      Promise.resolve(listPlugins()),
    ]);

    return {
      registrations: dbPlugins,
      runtime: runtimePlugins.map((plugin) => ({
        slug: plugin.slug,
        module: plugin.module,
        lifecycles: Object.keys(plugin.handlers),
      })),
    };
  }

  lifecycles() {
    return {
      hooks: [
        "onToolCreated",
        "onToolUpdated",
        "onCrawlerFinished",
        "beforePublish",
        "afterPublish",
        "beforeSEO",
      ],
      directories: [
        "plugins/seo",
        "plugins/crawler",
        "plugins/ai",
        "plugins/analytics",
        "plugins/billing",
      ],
    };
  }
}
