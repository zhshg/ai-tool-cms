import { envSchema, type Env } from "./schema";
import { loadRootDotenv } from "./load-dotenv";

type EnvSource = Record<string, string | undefined>;

function readFirst(env: EnvSource, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value.trim() !== "") {
      return value;
    }
  }

  return undefined;
}

export function parseEnv(source?: EnvSource): Env {
  if (source === undefined) {
    loadRootDotenv();
  }

  const resolved = source ?? process.env;

  const raw = {
    NODE_ENV: resolved.NODE_ENV,
    DATABASE_URL: resolved.DATABASE_URL,
    REDIS_URL: resolved.REDIS_URL,
    MEILI_URL: readFirst(resolved, ["MEILI_URL", "MEILISEARCH_URL", "MEILISEARCH_HOST"]),
    MEILI_MASTER_KEY: readFirst(resolved, ["MEILI_MASTER_KEY", "MEILISEARCH_API_KEY"]),
    EMBEDDING_PROVIDER: resolved.EMBEDDING_PROVIDER,
    EMBEDDING_MODEL: resolved.EMBEDDING_MODEL,
    VOYAGE_API_KEY: resolved.VOYAGE_API_KEY,
    JINA_API_KEY: resolved.JINA_API_KEY,
    BGE_EMBEDDING_URL: resolved.BGE_EMBEDDING_URL,
    GA4_MEASUREMENT_ID: resolved.GA4_MEASUREMENT_ID,
    GA4_API_SECRET: resolved.GA4_API_SECRET,
    POSTHOG_API_KEY: resolved.POSTHOG_API_KEY,
    POSTHOG_HOST: resolved.POSTHOG_HOST,
    UMAMI_URL: resolved.UMAMI_URL,
    UMAMI_WEBSITE_ID: resolved.UMAMI_WEBSITE_ID,
    OPENAI_API_KEY: readFirst(resolved, ["OPENAI_API_KEY", "OPENAI_KEY"]),
    GEMINI_API_KEY: readFirst(resolved, ["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
    ANTHROPIC_API_KEY: resolved.ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY: resolved.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: resolved.DEEPSEEK_BASE_URL,
    JWT_SECRET: resolved.JWT_SECRET,
    JWT_EXPIRES_IN: resolved.JWT_EXPIRES_IN,
    JWT_ACCESS_EXPIRES_IN: resolved.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_SECRET: resolved.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: resolved.JWT_REFRESH_EXPIRES_IN,
    APP_URL: resolved.APP_URL ?? resolved.NEXT_PUBLIC_APP_URL,
    ADMIN_URL: resolved.ADMIN_URL,
    API_URL: resolved.API_URL,
    PORT: resolved.PORT ?? resolved.API_PORT,
    LOG_LEVEL: resolved.LOG_LEVEL,
    QUEUE_URL: resolved.QUEUE_URL,
    OPENAI_BASE_URL: resolved.OPENAI_BASE_URL,
    AI_DEFAULT_MODEL: resolved.AI_DEFAULT_MODEL,
    NEXT_PUBLIC_APP_URL: resolved.NEXT_PUBLIC_APP_URL ?? resolved.APP_URL,
    NEXT_PUBLIC_ADMIN_MOCK_ROLE: resolved.NEXT_PUBLIC_ADMIN_MOCK_ROLE,
    SITE_NAME: resolved.SITE_NAME,
    SITE_DESCRIPTION: resolved.SITE_DESCRIPTION,
    DEFAULT_LOCALE: resolved.DEFAULT_LOCALE,
    STORAGE_ENDPOINT: resolved.STORAGE_ENDPOINT,
    STORAGE_BUCKET: resolved.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: resolved.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: resolved.STORAGE_SECRET_KEY,
    STORAGE_REGION: resolved.STORAGE_REGION,
    SMTP_HOST: resolved.SMTP_HOST,
    SMTP_PORT: resolved.SMTP_PORT,
    SMTP_USER: resolved.SMTP_USER,
    SMTP_PASSWORD: resolved.SMTP_PASSWORD,
    MAILPIT_URL: resolved.MAILPIT_URL,
    CRAWLER_ENABLE_PRODUCTION_ADAPTERS: resolved.CRAWLER_ENABLE_PRODUCTION_ADAPTERS,
    AI_PIPELINE_AUTO_PUBLISH: resolved.AI_PIPELINE_AUTO_PUBLISH,
  };

  return envSchema.parse(raw);
}

/** @deprecated Use `parseEnv` instead. */
export const parseConfig = parseEnv;
