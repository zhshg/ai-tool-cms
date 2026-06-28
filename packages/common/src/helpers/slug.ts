import { SLUG } from "../constants";

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, SLUG.maxLength);
}

export function isSlugFormat(value: string): boolean {
  return SLUG.pattern.test(value);
}

export function normalizeSlug(value: string): string {
  const slug = slugify(value);
  if (!isSlugFormat(slug)) {
    throw new Error("Unable to normalize value into a valid slug");
  }

  return slug;
}
