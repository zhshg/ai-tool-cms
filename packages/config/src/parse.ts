import { envSchema, type Env } from "./schema";

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

export function parseEnv(source: EnvSource = process.env): Env {
  const raw = {
    NODE_ENV: source.NODE_ENV,
    DATABASE_URL: source.DATABASE_URL,
    REDIS_URL: source.REDIS_URL,
    MEILI_URL: readFirst(source, ["MEILI_URL", "MEILISEARCH_URL", "MEILISEARCH_HOST"]),
    OPENAI_API_KEY: readFirst(source, ["OPENAI_API_KEY", "OPENAI_KEY"]),
    GEMINI_API_KEY: readFirst(source, ["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
    ANTHROPIC_API_KEY: source.ANTHROPIC_API_KEY,
    JWT_SECRET: source.JWT_SECRET,
    JWT_EXPIRES_IN: source.JWT_EXPIRES_IN,
    JWT_ACCESS_EXPIRES_IN: source.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_SECRET: source.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: source.JWT_REFRESH_EXPIRES_IN,
    APP_URL: source.APP_URL ?? source.NEXT_PUBLIC_APP_URL,
    ADMIN_URL: source.ADMIN_URL,
    API_URL: source.API_URL,
    PORT: source.PORT ?? source.API_PORT,
    LOG_LEVEL: source.LOG_LEVEL,
    QUEUE_URL: source.QUEUE_URL,
    OPENAI_BASE_URL: source.OPENAI_BASE_URL,
    AI_DEFAULT_MODEL: source.AI_DEFAULT_MODEL,
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL ?? source.APP_URL,
    NEXT_PUBLIC_ADMIN_MOCK_ROLE: source.NEXT_PUBLIC_ADMIN_MOCK_ROLE,
    SITE_NAME: source.SITE_NAME,
    SITE_DESCRIPTION: source.SITE_DESCRIPTION,
    DEFAULT_LOCALE: source.DEFAULT_LOCALE,
    STORAGE_ENDPOINT: source.STORAGE_ENDPOINT,
    STORAGE_BUCKET: source.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: source.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: source.STORAGE_SECRET_KEY,
    STORAGE_REGION: source.STORAGE_REGION,
    SMTP_HOST: source.SMTP_HOST,
    SMTP_PORT: source.SMTP_PORT,
    SMTP_USER: source.SMTP_USER,
    SMTP_PASSWORD: source.SMTP_PASSWORD,
    MAILPIT_URL: source.MAILPIT_URL,
  };

  return envSchema.parse(raw);
}

/** @deprecated Use `parseEnv` instead. */
export const parseConfig = parseEnv;
