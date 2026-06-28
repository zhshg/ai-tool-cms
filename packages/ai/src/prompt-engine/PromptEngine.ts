import type { ChatMessage } from "../types";
import { PromptRegistry, resolvePromptsRoot } from "./PromptRegistry";
import type {
  PromptResolveOptions,
  PromptTemplateId,
  PromptVariables,
  ResolvedPrompt,
  ToolPromptContext,
} from "./types";

export type {
  PromptCatalogConfig,
  PromptResolveOptions,
  PromptTemplateId,
  PromptVariables,
  ResolvedPrompt,
  ToolPromptContext,
} from "./types";

export { PromptRegistry, pickWeightedVariant, resolvePromptsRoot } from "./PromptRegistry";

/**
 * Unified Prompt Engine — loads versioned markdown templates from packages/ai/prompts/.
 *
 * Features: markdown templates, versioning, locales, A/B variants, reload() for hot-update.
 */
export class PromptEngine {
  private readonly registry: PromptRegistry;

  constructor(promptsDir?: string) {
    this.registry = new PromptRegistry(resolvePromptsRoot(promptsDir));
  }

  getPromptsDir(): string {
    return this.registry.getPromptsRoot();
  }

  /** Re-read registry.yaml and template files from disk (future admin hot-reload). */
  reload(): void {
    this.registry.reload();
  }

  loadCatalog() {
    return this.registry.loadCatalog();
  }

  listTemplates(): PromptTemplateId[] {
    return this.registry.listTemplates();
  }

  listVersions(templateId: PromptTemplateId): string[] {
    return this.registry.listVersions(templateId);
  }

  discoverCatalogTree() {
    return this.registry.discoverCatalogTree();
  }

  resolve(options: PromptResolveOptions): ResolvedPrompt {
    return this.registry.resolve(options);
  }

  render(template: string, variables: PromptVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
  }

  toToolVariables(ctx: ToolPromptContext): PromptVariables {
    return {
      tool_name: ctx.tool_name,
      website: ctx.website ?? "",
      description: ctx.description ?? "",
      category: ctx.category ?? "",
      features: ctx.features ?? "",
      summary: ctx.summary ?? "",
      slug: ctx.slug ?? "",
      locale: ctx.locale ?? "en",
    };
  }

  renderTemplate(id: PromptTemplateId, ctx: ToolPromptContext): string {
    const resolved = this.resolve({
      templateId: id,
      locale: ctx.locale,
      abBucket: ctx.abBucket,
    });
    return this.render(resolved.user, this.toToolVariables(ctx));
  }

  buildMessages(id: PromptTemplateId, ctx: ToolPromptContext): ChatMessage[] {
    const resolved = this.resolve({
      templateId: id,
      locale: ctx.locale,
      abBucket: ctx.abBucket,
    });
    const variables = this.toToolVariables(ctx);

    return [
      { role: "system", content: this.render(resolved.system, variables) },
      { role: "user", content: this.render(resolved.user, variables) },
    ];
  }
}

export const defaultPromptEngine = new PromptEngine();
