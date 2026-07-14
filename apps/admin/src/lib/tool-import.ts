export function extractImportJsonRecords(value: unknown): Array<Record<string, unknown>> | null {
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidates = [record.items, record.data, record.records, record.tools];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Array<Record<string, unknown>>;
    }
  }

  return null;
}
