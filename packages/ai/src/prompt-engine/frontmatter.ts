import { parse as parseYaml } from "yaml";

export type MarkdownFrontmatter = Record<string, unknown>;

export function parseFrontmatter(raw: string): { meta: MarkdownFrontmatter; body: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: {}, body: raw.trim() };
  }

  const end = trimmed.indexOf("\n---", 3);
  if (end < 0) {
    return { meta: {}, body: raw.trim() };
  }

  const yamlBlock = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).trim();
  const meta = yamlBlock ? (parseYaml(yamlBlock) as MarkdownFrontmatter) : {};

  return { meta, body };
}
