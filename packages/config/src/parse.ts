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
    OPENAI_API_KEY: readFirst(resolved, ["OPENAI_API_KEY", "OPENAI_KEY"]),
    GEMINI_API_KEY: readFirst(resolved, ["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
    ANTHROPIC_API_KEY: resolved.ANTHROPIC_API_KEY,
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
  };

  return envSchema.parse(raw);
}

/** @deprecated Use `parseEnv` instead. */
export const parseConfig = parseEnv;
