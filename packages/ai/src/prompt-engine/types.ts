export type PromptTemplateId =
  "summary" | "faq" | "seo" | "geo" | "compare" | "pros-cons" | "feature";

export type PromptVariables = Record<string, string | undefined>;

export type ToolPromptContext = {
  tool_name: string;
  website?: string;
  description?: string;
  category?: string;
  features?: string;
  summary?: string;
  slug?: string;
  locale?: string;
  /** 0–99 bucket for deterministic A/B variant selection */
  abBucket?: number;
};

export type PromptResolveOptions = {
  templateId: PromptTemplateId;
  locale?: string;
  version?: string | "latest";
  /** `auto` selects by weighted A/B; otherwise forces a variant id */
  variant?: string | "auto";
  abBucket?: number;
};

export type ResolvedPrompt = {
  templateId: PromptTemplateId;
  version: string;
  locale: string;
  variant: string;
  system: string;
  user: string;
  sourcePath: string;
};

export type VariantWeight = { weight: number };

export type TemplateVersionConfig = {
  locales: string[];
  variants: Record<string, VariantWeight>;
};

export type TemplateConfig = {
  description?: string;
  latestVersion: string;
  versions: Record<string, TemplateVersionConfig>;
};

export type PromptCatalogDefaults = {
  locale: string;
  version: string;
  variant: string;
  system: string;
};

export type PromptCatalogConfig = {
  apiVersion: string;
  kind: string;
  defaults: PromptCatalogDefaults;
  templates: Record<PromptTemplateId, TemplateConfig>;
};
