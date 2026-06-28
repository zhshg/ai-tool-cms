import { createHash } from "node:crypto";

const AI_KEYWORDS =
  /\b(ai|artificial intelligence|machine learning|llm|gpt|claude|gemini|copilot|agent|chatbot|neural|deep learning)\b/i;

export function scoreAiRelevance(title: string, description?: string): number {
  const text = `${title} ${description ?? ""}`;
  const matches = text.match(new RegExp(AI_KEYWORDS.source, "gi")) ?? [];
  const base = Math.min(1, matches.length * 0.2);
  const titleBoost = AI_KEYWORDS.test(title) ? 0.3 : 0;
  return Math.min(1, Number((base + titleBoost + 0.1).toFixed(3)));
}

export function hashExternalId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

export async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ai-tool-cms-discovery/1.0",
        Accept: "application/json, text/html, application/rss+xml, application/xml",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const anchorRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1]!, baseUrl).toString();
      links.add(resolved);
    } catch {
      // skip invalid URLs
    }
  }
  return [...links];
}

export function parseRssItems(
  xml: string,
): Array<{ title: string; link: string; description?: string }> {
  const items: Array<{ title: string; link: string; description?: string }> = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const blocks = xml.match(itemRegex) ?? [];
  for (const block of blocks) {
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim();
    const description = block
      .match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]
      ?.trim();
    if (title && link) {
      items.push({ title, link, description });
    }
  }
  return items;
}
