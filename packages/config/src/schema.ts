import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

const optionalUrl = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const envSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: optionalString,
  REDIS_URL: optionalUrl,
  MEILI_URL: optionalUrl,
  MEILI_MASTER_KEY: optionalString,
  EMBEDDING_PROVIDER: z.enum(["openai", "gemini", "voyage", "jina", "bge", "mock"]).default("mock"),
  EMBEDDING_MODEL: optionalString,
  VOYAGE_API_KEY: optionalString,
  JINA_API_KEY: optionalString,
  BGE_EMBEDDING_URL: optionalUrl,
  GA4_MEASUREMENT_ID: optionalString,
  GA4_API_SECRET: optionalString,
  POSTHOG_API_KEY: optionalString,
  POSTHOG_HOST: optionalUrl,
  UMAMI_URL: optionalUrl,
  UMAMI_WEBSITE_ID: optionalString,
  OPENAI_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  DEEPSEEK_API_KEY: optionalString,
  DEEPSEEK_BASE_URL: optionalUrl,
  JWT_SECRET: optionalString,
  JWT_EXPIRES_IN: z.string().default("7d"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: optionalString,
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:3001"),
  API_URL: z.string().url().default("http://localhost:4000"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),
  QUEUE_URL: optionalUrl,
  OPENAI_BASE_URL: optionalUrl,
  AI_DEFAULT_MODEL: z.string().default("gpt-4o-mini"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_ADMIN_MOCK_ROLE: z.string().default("admin"),
  SITE_NAME: z.string().default("AI Tool CMS"),
  SITE_DESCRIPTION: optionalString,
  DEFAULT_LOCALE: z.string().default("zh-CN"),
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_BUCKET: z.string().default("ai-tool-cms"),
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  STORAGE_REGION: z.string().default("us-east-1"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  MAILPIT_URL: z.string().url().default("http://localhost:8025"),
  CRAWLER_ENABLE_PRODUCTION_ADAPTERS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  /** Sprint 4: auto-apply AI output and publish tool without human review (default: true). */
  AI_PIPELINE_AUTO_PUBLISH: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
});

export type Env = z.infer<typeof envSchema>;

/** @deprecated Use `Env` instead. */
export type AppConfig = Env;

/** @deprecated Use `envSchema` instead. */
export const configSchema = envSchema;
