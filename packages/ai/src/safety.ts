import type { AiSafetyOptions } from "./types";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;

/**
 * Post-generation safety filters (RFC-0003).
 */
export function applySafetyFilters(content: string, options: AiSafetyOptions = {}): string {
  let output = content.trim();
  const scrubPii = options.scrubPii ?? true;

  if (scrubPii) {
    output = output.replace(EMAIL_PATTERN, "[email redacted]");
    output = output.replace(PHONE_PATTERN, "[phone redacted]");
  }

  if (options.maxOutputChars && output.length > options.maxOutputChars) {
    output = `${output.slice(0, options.maxOutputChars).trimEnd()}…`;
  }

  return output;
}

export function enforceMaxTokens(requested: number | undefined, cap: number | undefined): number {
  const value = requested ?? cap ?? 4096;
  if (!cap) return value;
  return Math.min(value, cap);
}
