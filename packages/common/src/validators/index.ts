import { z } from "zod";
import { PAGINATION, RATING, SLUG } from "../constants";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(SLUG.maxLength)
  .regex(SLUG.pattern, "Slug must be lowercase kebab-case");

export const emailSchema = z.string().trim().email();

export const urlSchema = z.string().trim().url();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.defaultPage),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.maxLimit)
    .default(PAGINATION.defaultLimit),
});

export const ratingSchema = z.coerce.number().int().min(RATING.min).max(RATING.max);

export function parseSlug(value: unknown): string {
  return slugSchema.parse(value);
}

export function parseEmail(value: unknown): string {
  return emailSchema.parse(value);
}

export function parseUrl(value: unknown): string {
  return urlSchema.parse(value);
}

export function parsePaginationQuery(value: unknown): z.infer<typeof paginationQuerySchema> {
  return paginationQuerySchema.parse(value);
}

export function parseRating(value: unknown): number {
  return ratingSchema.parse(value);
}

export function safeParseSlug(value: unknown) {
  return slugSchema.safeParse(value);
}
