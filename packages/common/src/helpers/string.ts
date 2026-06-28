export function truncate(value: string, maxLength: number, suffix = "..."): string {
  if (value.length <= maxLength) {
    return value;
  }

  const trimmedLength = Math.max(0, maxLength - suffix.length);
  return `${value.slice(0, trimmedLength).trimEnd()}${suffix}`;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
