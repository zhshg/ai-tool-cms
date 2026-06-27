export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = normalizeUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function resolveAbsoluteUrl(url: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return joinUrl(baseUrl, url);
}
