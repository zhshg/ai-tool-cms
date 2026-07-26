const HTML_TAG_PATTERN = /<[^>]*>/g;
const BLOCK_BREAK_PATTERN = /<\/(p|div|li|h\d|blockquote|section|article)>|<br\s*\/?>/gi;
const MULTIPLE_NEWLINES_PATTERN = /\n{3,}/g;
const WHITESPACE_PATTERN = /[ \t]+/g;
const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";

  return decodeHtmlEntities(
    value
      .replace(BLOCK_BREAK_PATTERN, "\n")
      .replace(HTML_TAG_PATTERN, "")
      .replace(/\r\n?/g, "\n")
      .replace(MULTIPLE_NEWLINES_PATTERN, "\n\n")
      .replace(WHITESPACE_PATTERN, " ")
      .trim(),
  );
}

export function normalizePlainText(value: string | null | undefined): string {
  return stripHtml(value)
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function splitRichText(value: string | null | undefined): string[] {
  const text = normalizePlainText(value);
  if (!text) return [];

  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) =>
      part
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .map((item) => item.replace(/^[•*-]\s*/, "").trim())
    .filter(Boolean);
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity, name: string) => {
    return HTML_ENTITY_MAP[entity] ?? HTML_ENTITY_MAP[`&${name};`] ?? entity;
  });
}
