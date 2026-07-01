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
    ENABLED_LOCALES: resolved.ENABLED_LOCALES,
    FALLBACK_LOCALE: resolved.FALLBACK_LOCALE,
    CDN_PROVIDER: resolved.CDN_PROVIDER,
    CLOUDFLARE_ZONE_ID: resolved.CLOUDFLARE_ZONE_ID,
    CLOUDFLARE_API_TOKEN: resolved.CLOUDFLARE_API_TOKEN,
    R2_BUCKET: resolved.R2_BUCKET,
    R2_ENDPOINT: resolved.R2_ENDPOINT,
    EDGE_CACHE_TTL_SECONDS: resolved.EDGE_CACHE_TTL_SECONDS,
    NEXT_PUBLIC_ENABLED_LOCALES: resolved.NEXT_PUBLIC_ENABLED_LOCALES,
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
    NEWSLETTER_FROM_EMAIL: resolved.NEWSLETTER_FROM_EMAIL,
    WEBHOOK_SIGNING_SECRET: resolved.WEBHOOK_SIGNING_SECRET,
    CRAWLER_ENABLE_PRODUCTION_ADAPTERS: resolved.CRAWLER_ENABLE_PRODUCTION_ADAPTERS,
    CRAWLER_CONCURRENCY: resolved.CRAWLER_CONCURRENCY,
    CRAWLER_TIMEOUT_MS: resolved.CRAWLER_TIMEOUT_MS,
    AI_PIPELINE_AUTO_PUBLISH: resolved.AI_PIPELINE_AUTO_PUBLISH,
  };

  const parsed = envSchema.parse(raw);
  validateProductionEnv(parsed);
  return parsed;
}

/** @deprecated Use `parseEnv` instead. */
export const parseConfig = parseEnv;

function validateProductionEnv(env: Env): void {
  if (process.env.BUILD_SKIP_ENV_VALIDATION === "true") {
    return;
  }

  if (env.NODE_ENV !== "production") {
    return;
  }

  const required: Array<keyof Env> = [
    "DATABASE_URL",
    "REDIS_URL",
    "QUEUE_URL",
    "MEILI_URL",
    "MEILI_MASTER_KEY",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "CORS_ORIGINS",
    "APP_URL",
    "ADMIN_URL",
    "API_URL",
    "NEXT_PUBLIC_APP_URL",
    "STORAGE_ENDPOINT",
    "STORAGE_ACCESS_KEY",
    "STORAGE_SECRET_KEY",
    "SMTP_HOST",
    "NEWSLETTER_FROM_EMAIL",
  ];

  const missing = required.filter((key) => {
    const value = env[key];
    return value === undefined || value === null || String(value).trim() === "";
  });

  const placeholders = [
    "your-jwt-secret-change-in-production",
    "your-jwt-refresh-secret-change-in-production",
    "replace-with-strong-jwt-secret",
    "replace-with-strong-refresh-secret",
    "replace-with-strong-postgres-password",
    "replace-with-strong-redis-password",
    "replace-with-strong-meilisearch-key",
    "replace-with-storage-access-key",
    "replace-with-storage-secret-key",
    "replace-with-smtp-user",
    "replace-with-smtp-password",
    "replace-with-webhook-signing-secret",
  ];

  const placeholderKeys = required.filter((key) => {
    const value = env[key];
    return typeof value === "string" && placeholders.some((placeholder) => value.includes(placeholder));
  });

  if (missing.length > 0 || placeholderKeys.length > 0) {
    const details = [
      missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
      placeholderKeys.length > 0 ? `placeholder: ${placeholderKeys.join(", ")}` : undefined,
    ]
      .filter(Boolean)
      .join("; ");

    // 生产环境必须快速失败，避免服务带默认密钥或缺失依赖启动。
    throw new Error(`Invalid production environment configuration (${details})`);
  }
}
