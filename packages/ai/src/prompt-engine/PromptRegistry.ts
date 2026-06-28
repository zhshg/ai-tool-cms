import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { parseFrontmatter } from "./frontmatter";
import type {
  PromptCatalogConfig,
  PromptResolveOptions,
  PromptTemplateId,
  ResolvedPrompt,
  TemplateVersionConfig,
  VariantWeight,
} from "./types";

export class PromptRegistry {
  private catalog: PromptCatalogConfig | null = null;
  private fileCache = new Map<string, { meta: Record<string, unknown>; body: string }>();

  constructor(private readonly promptsRoot: string) {}

  /** Clear caches — call after editing markdown on disk (future admin hot-reload). */
  reload(): void {
    this.catalog = null;
    this.fileCache.clear();
  }

  getPromptsRoot(): string {
    return this.promptsRoot;
  }

  loadCatalog(): PromptCatalogConfig {
    if (this.catalog) return this.catalog;

    const registryPath = join(this.promptsRoot, "registry.yaml");
    const raw = readFileSync(registryPath, "utf-8");
    this.catalog = parseYaml(raw) as PromptCatalogConfig;
    return this.catalog;
  }

  listTemplates(): PromptTemplateId[] {
    const catalog = this.loadCatalog();
    return Object.keys(catalog.templates) as PromptTemplateId[];
  }

  listVersions(templateId: PromptTemplateId): string[] {
    const catalog = this.loadCatalog();
    return Object.keys(catalog.templates[templateId]?.versions ?? {});
  }

  resolve(options: PromptResolveOptions): ResolvedPrompt {
    const catalog = this.loadCatalog();
    const templateConfig = catalog.templates[options.templateId];
    if (!templateConfig) {
      throw new Error(`Unknown prompt template: ${options.templateId}`);
    }

    const version = this.resolveVersion(templateConfig.latestVersion, options.version);
    const versionConfig = templateConfig.versions[version];
    if (!versionConfig) {
      throw new Error(`Prompt version not found: ${options.templateId}@${version}`);
    }

    const locale = options.locale ?? catalog.defaults.locale;
    const localeResolved = versionConfig.locales.includes(locale)
      ? locale
      : (versionConfig.locales[0] ?? catalog.defaults.locale);

    const variant = this.resolveVariant(
      versionConfig,
      options.variant ?? catalog.defaults.variant,
      options.abBucket,
      `${options.templateId}:${version}:${localeResolved}`,
    );

    const sourcePath = join(
      this.promptsRoot,
      "catalog",
      options.templateId,
      `v${version}`,
      localeResolved,
      `${variant}.md`,
    );

    if (!existsSync(sourcePath)) {
      throw new Error(`Prompt file not found: ${sourcePath}`);
    }

    const { meta, body } = this.readMarkdown(sourcePath);
    const systemPath = (meta.system as string | undefined) ?? catalog.defaults.system;
    const system = this.readSystemPrompt(systemPath);

    return {
      templateId: options.templateId,
      version,
      locale: localeResolved,
      variant,
      system,
      user: body,
      sourcePath,
    };
  }

  private resolveVersion(latestVersion: string, requested?: string | "latest"): string {
    if (!requested || requested === "latest") return latestVersion;
    return requested;
  }

  private resolveVariant(
    versionConfig: TemplateVersionConfig,
    requested: string | "auto",
    abBucket: number | undefined,
    seed: string,
  ): string {
    const entries = Object.entries(versionConfig.variants);
    if (entries.length === 0) return "default";

    if (requested !== "auto" && versionConfig.variants[requested]) {
      return requested;
    }

    const bucket = abBucket ?? this.hashBucket(seed);
    return pickWeightedVariant(entries, bucket);
  }

  private hashBucket(seed: string): number {
    const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
    return parseInt(hex, 16) % 100;
  }

  private readMarkdown(path: string): { meta: Record<string, unknown>; body: string } {
    const cached = this.fileCache.get(path);
    if (cached) return cached;

    const parsed = parseFrontmatter(readFileSync(path, "utf-8"));
    this.fileCache.set(path, parsed);
    return parsed;
  }

  private readSystemPrompt(relativePath: string): string {
    const path = join(this.promptsRoot, relativePath);
    if (!existsSync(path)) {
      throw new Error(`System prompt not found: ${path}`);
    }
    return readFileSync(path, "utf-8").trim();
  }

  /** Discover catalog layout on disk (for admin / diagnostics). */
  discoverCatalogTree(): Array<{
    templateId: string;
    version: string;
    locale: string;
    variant: string;
    path: string;
  }> {
    const catalogDir = join(this.promptsRoot, "catalog");
    if (!existsSync(catalogDir)) return [];

    const results: Array<{
      templateId: string;
      version: string;
      locale: string;
      variant: string;
      path: string;
    }> = [];

    for (const templateId of readdirSync(catalogDir)) {
      const templateDir = join(catalogDir, templateId);
      if (!statSync(templateDir).isDirectory()) continue;

      for (const versionDir of readdirSync(templateDir)) {
        if (!versionDir.startsWith("v")) continue;
        const version = versionDir.slice(1);
        const versionPath = join(templateDir, versionDir);

        for (const locale of readdirSync(versionPath)) {
          const localePath = join(versionPath, locale);
          if (!statSync(localePath).isDirectory()) continue;

          for (const file of readdirSync(localePath)) {
            if (!file.endsWith(".md")) continue;
            results.push({
              templateId,
              version,
              locale,
              variant: file.replace(/\.md$/, ""),
              path: join(localePath, file),
            });
          }
        }
      }
    }

    return results;
  }
}

export function pickWeightedVariant(
  entries: Array<[string, VariantWeight]>,
  bucket: number,
): string {
  const total = entries.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
  if (total <= 0) return entries[0]?.[0] ?? "default";

  const target = bucket % total;
  let cursor = 0;
  for (const [variant, cfg] of entries) {
    cursor += cfg.weight;
    if (target < cursor) return variant;
  }
  return entries[entries.length - 1]?.[0] ?? "default";
}

export function resolvePromptsRoot(explicitDir?: string): string {
  if (explicitDir && existsSync(explicitDir)) {
    return explicitDir;
  }

  const candidates = [
    join(dirname(dirname(__dirname)), "prompts"),
    join(process.cwd(), "packages/ai/prompts"),
    join(process.cwd(), "prompts"),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, "registry.yaml"))) return dir;
  }

  return join(dirname(dirname(__dirname)), "prompts");
}
