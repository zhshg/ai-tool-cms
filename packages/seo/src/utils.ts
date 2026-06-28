export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function joinUrl(base: string, path: string): string {
  const normalizedBase = normalizeUrl(base);
  if (!path || path === "/") return `${normalizedBase}/`;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function resolveAbsoluteUrl(url: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return joinUrl(baseUrl, url);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function toIsoDate(value?: Date | string): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function slugPairKey(a: string, b: string): string {
  return [a, b].sort().join("-vs-");
}
