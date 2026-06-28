import type { PrismaClient } from "@ai-tool-cms/database";

export type PluginLifecycle =
  | "onToolCreated"
  | "onToolUpdated"
  | "onCrawlerFinished"
  | "beforePublish"
  | "afterPublish"
  | "beforeSEO";

export type PluginContext = {
  toolId?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
};

export type PluginHandler = (ctx: PluginContext) => Promise<void> | void;

export type RegisteredPlugin = {
  slug: string;
  module: string;
  handlers: Partial<Record<PluginLifecycle, PluginHandler>>;
};

const registry = new Map<string, RegisteredPlugin>();

export function registerPlugin(plugin: RegisteredPlugin): void {
  registry.set(plugin.slug, plugin);
}

export function getPlugin(slug: string): RegisteredPlugin | undefined {
  return registry.get(slug);
}

export function listPlugins(): RegisteredPlugin[] {
  return [...registry.values()];
}

export async function runPluginLifecycle(
  prisma: PrismaClient,
  lifecycle: PluginLifecycle,
  ctx: PluginContext,
): Promise<{ executed: string[] }> {
  const executed: string[] = [];
  const dbPlugins = await prisma.pluginRegistration.findMany({
    where: { status: "ACTIVE", deletedAt: null },
  });

  for (const dbPlugin of dbPlugins) {
    const plugin = registry.get(dbPlugin.slug);
    const handler = plugin?.handlers[lifecycle];
    if (!handler) continue;
    await handler(ctx);
    executed.push(dbPlugin.slug);
  }

  return { executed };
}

/** Built-in plugin stubs for seo/crawler/ai/analytics/billing modules */
export function registerBuiltinPlugins(): void {
  for (const module of ["seo", "crawler", "ai", "analytics", "billing"]) {
    registerPlugin({
      slug: `builtin-${module}`,
      module,
      handlers: {
        afterPublish: async (ctx) => {
          // 插件扩展点：各模块可替换为真实实现
          void ctx;
        },
      },
    });
  }
}
