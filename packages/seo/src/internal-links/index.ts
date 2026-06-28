import type { ComparePageKind, ComparePageSpec, InternalLink } from "../types";
import { joinUrl, slugPairKey } from "../utils";
import { getSiteConfig } from "../site-config";

export type ToolLinkContext = {
  slug: string;
  name: string;
  categorySlug?: string;
  categoryName?: string;
  tagSlugs?: string[];
  relatedTools?: Array<{ slug: string; name: string }>;
  trendingTools?: Array<{ slug: string; name: string }>;
  promptSlugs?: string[];
  faqAnchors?: string[];
};

const MIN_INTERNAL_LINKS = 20;

/**
 * Build internal link graph for a tool page (Commit 044).
 * Chain: Tool → Alternatives → Compare → Category → Tags → Prompt → FAQ → Related → Trending
 */
export function buildToolInternalLinks(
  tool: ToolLinkContext,
  locale = "en",
  config = getSiteConfig(),
): InternalLink[] {
  const base = `/${locale}`;
  const links: InternalLink[] = [];
  const seen = new Set<string>();

  const push = (link: InternalLink) => {
    const key = `${link.type}:${link.href}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  push({
    href: joinUrl(config.siteUrl, `${base}/tools/${tool.slug}/alternatives`),
    anchor: `Best ${tool.name} alternatives`,
    type: "alternative",
    targetSlug: `${tool.slug}-alternatives`,
    targetKind: "compare",
  });

  for (const related of tool.relatedTools ?? []) {
    push({
      href: joinUrl(config.siteUrl, `${base}/compare/${slugPairKey(tool.slug, related.slug)}`),
      anchor: `${tool.name} vs ${related.name}`,
      type: "compare",
      targetSlug: slugPairKey(tool.slug, related.slug),
      targetKind: "compare",
    });
  }

  if (tool.categorySlug && tool.categoryName) {
    push({
      href: joinUrl(config.siteUrl, `${base}/category/${tool.categorySlug}`),
      anchor: tool.categoryName,
      type: "category",
      targetSlug: tool.categorySlug,
      targetKind: "category",
    });
  }

  for (const tagSlug of tool.tagSlugs ?? []) {
    push({
      href: joinUrl(config.siteUrl, `${base}/tag/${tagSlug}`),
      anchor: tagSlug.replace(/-/g, " "),
      type: "tag",
      targetSlug: tagSlug,
      targetKind: "tag",
    });
  }

  for (const promptSlug of tool.promptSlugs ?? []) {
    push({
      href: joinUrl(config.siteUrl, `${base}/prompts/${promptSlug}`),
      anchor: `Prompt: ${promptSlug}`,
      type: "prompt",
      targetSlug: promptSlug,
      targetKind: "prompt",
    });
  }

  for (const anchor of tool.faqAnchors ?? ["faq"]) {
    push({
      href: joinUrl(config.siteUrl, `${base}/tools/${tool.slug}#${anchor}`),
      anchor: "FAQ",
      type: "faq",
      targetSlug: tool.slug,
      targetKind: "faq",
    });
  }

  for (const related of tool.relatedTools ?? []) {
    push({
      href: joinUrl(config.siteUrl, `${base}/tools/${related.slug}`),
      anchor: related.name,
      type: "related",
      targetSlug: related.slug,
      targetKind: "tool",
    });
  }

  for (const trending of tool.trendingTools ?? []) {
    push({
      href: joinUrl(config.siteUrl, `${base}/tools/${trending.slug}`),
      anchor: trending.name,
      type: "trending",
      targetSlug: trending.slug,
      targetKind: "tool",
    });
  }

  return padInternalLinks(links, tool, locale, config);
}

function padInternalLinks(
  links: InternalLink[],
  tool: ToolLinkContext,
  locale: string,
  config: ReturnType<typeof getSiteConfig>,
): InternalLink[] {
  if (links.length >= MIN_INTERNAL_LINKS) return links;

  const base = `/${locale}`;
  const padded = [...links];
  let i = 0;
  while (padded.length < MIN_INTERNAL_LINKS) {
    const related = tool.relatedTools?.[i % (tool.relatedTools.length || 1)];
    if (related) {
      padded.push({
        href: joinUrl(config.siteUrl, `${base}/tools/${related.slug}`),
        anchor: `${related.name} review`,
        type: "related",
        targetSlug: related.slug,
        targetKind: "tool",
      });
    } else {
      padded.push({
        href: joinUrl(config.siteUrl, `${base}/tools/${tool.slug}#overview-${i}`),
        anchor: `${tool.name} overview ${i + 1}`,
        type: "related",
        targetSlug: tool.slug,
        targetKind: "tool",
      });
    }
    i += 1;
  }
  return padded;
}

export function buildComparePagePath(spec: ComparePageSpec, locale = "en"): string {
  return `/${locale}/compare/${spec.slug}`;
}

export function buildAlternativesPagePath(toolSlug: string, locale = "en"): string {
  return `/${locale}/tools/${toolSlug}/alternatives`;
}

export function buildCategoryPagePath(categorySlug: string, locale = "en"): string {
  return `/${locale}/category/${categorySlug}`;
}

export function buildTagPagePath(tagSlug: string, locale = "en"): string {
  return `/${locale}/tag/${tagSlug}`;
}

/** Preset high-intent compare/list pages (Commit 046). */
export const PRESET_COMPARE_PAGES: ComparePageSpec[] = [
  {
    slug: "chatgpt-vs-claude",
    kind: "tool_vs",
    title: "ChatGPT vs Claude",
    toolSlugs: ["chatgpt", "claude"],
  },
  {
    slug: "claude-vs-gemini",
    kind: "tool_vs",
    title: "Claude vs Gemini",
    toolSlugs: ["claude", "gemini"],
  },
  {
    slug: "cursor-vs-windsurf",
    kind: "tool_vs",
    title: "Cursor vs Windsurf",
    toolSlugs: ["cursor", "windsurf"],
  },
  {
    slug: "midjourney-vs-flux",
    kind: "tool_vs",
    title: "Midjourney vs Flux",
    toolSlugs: ["midjourney", "flux"],
  },
  {
    slug: "canva-vs-figma-ai",
    kind: "tool_vs",
    title: "Canva vs Figma AI",
    toolSlugs: ["canva", "figma-ai"],
  },
  {
    slug: "best-chatgpt-alternatives",
    kind: "alternatives",
    title: "Best ChatGPT Alternatives",
    toolSlugs: ["chatgpt"],
  },
  {
    slug: "top-ai-writing-tools",
    kind: "top_list",
    title: "Top AI Writing Tools",
    categorySlug: "ai-writing",
  },
  {
    slug: "best-ai-video-generators",
    kind: "top_list",
    title: "Best AI Video Generators",
    categorySlug: "video",
  },
  {
    slug: "top-ai-coding-assistants",
    kind: "top_list",
    title: "Top AI Coding Assistants",
    categorySlug: "coding",
  },
];

export function generateToolVsPages(
  tools: Array<{ slug: string; name: string; categorySlug?: string }>,
): ComparePageSpec[] {
  const byCategory = new Map<string, typeof tools>();
  for (const tool of tools) {
    const key = tool.categorySlug ?? "general";
    const list = byCategory.get(key) ?? [];
    list.push(tool);
    byCategory.set(key, list);
  }

  const specs: ComparePageSpec[] = [];
  for (const group of byCategory.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < Math.min(group.length, i + 4); j += 1) {
        const a = group[i]!;
        const b = group[j]!;
        specs.push({
          slug: slugPairKey(a.slug, b.slug),
          kind: "tool_vs",
          title: `${a.name} vs ${b.name}`,
          toolSlugs: [a.slug, b.slug],
          categorySlug: a.categorySlug,
        });
      }
    }
  }
  return specs;
}

export function generateAlternativesPages(
  tools: Array<{ slug: string; name: string }>,
): ComparePageSpec[] {
  return tools.map((tool) => ({
    slug: `best-${tool.slug}-alternatives`,
    kind: "alternatives" as ComparePageKind,
    title: `Best ${tool.name} Alternatives`,
    toolSlugs: [tool.slug],
  }));
}
