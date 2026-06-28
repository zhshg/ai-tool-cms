import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ChatMessage } from "../types";

export type PromptTemplateId =
  "summary" | "faq" | "seo" | "geo" | "compare" | "pros-cons" | "feature";

export type PromptVariables = Record<string, string | undefined>;

const TEMPLATE_FILES: Record<PromptTemplateId, string> = {
  summary: "summary.md",
  faq: "faq.md",
  seo: "seo.md",
  geo: "geo.md",
  compare: "compare.md",
  "pros-cons": "pros-cons.md",
  feature: "feature.md",
};

export type ToolPromptContext = {
  tool_name: string;
  website?: string;
  description?: string;
  category?: string;
  features?: string;
  summary?: string;
  slug?: string;
  locale?: string;
};

/**
 * Unified Prompt Engine (Commit 032) — loads markdown templates and interpolates variables.
 */
export class PromptEngine {
  constructor(private readonly promptsDir?: string) {}

  resolvePromptsDir(): string {
    if (this.promptsDir && existsSync(this.promptsDir)) {
      return this.promptsDir;
    }
    const candidates = [
      join(dirname(__dirname), "prompts"),
      join(process.cwd(), "packages/ai/prompts"),
      join(process.cwd(), "prompts"),
    ];
    for (const dir of candidates) {
      if (existsSync(dir)) return dir;
    }
    return join(dirname(__dirname), "prompts");
  }

  loadTemplate(id: PromptTemplateId): string {
    const file = TEMPLATE_FILES[id];
    const path = join(this.resolvePromptsDir(), file);
    return readFileSync(path, "utf-8");
  }

  render(template: string, variables: PromptVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
  }

  renderTemplate(id: PromptTemplateId, variables: PromptVariables): string {
    return this.render(this.loadTemplate(id), variables);
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

  buildMessages(id: PromptTemplateId, ctx: ToolPromptContext): ChatMessage[] {
    const userContent = this.renderTemplate(id, this.toToolVariables(ctx));
    return [
      {
        role: "system",
        content:
          "You are a precise content generation assistant. Follow the user instructions exactly.",
      },
      { role: "user", content: userContent },
    ];
  }

  listTemplates(): PromptTemplateId[] {
    return Object.keys(TEMPLATE_FILES) as PromptTemplateId[];
  }
}

export const defaultPromptEngine = new PromptEngine();
