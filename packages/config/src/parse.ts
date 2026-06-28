import { configSchema, type AppConfig } from "./schema";

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

export function parseConfig(env: EnvSource = process.env): AppConfig {
  const raw = {
    nodeEnv: env.NODE_ENV,
    app: {
      url: env.APP_URL,
      adminUrl: env.ADMIN_URL,
      apiUrl: env.API_URL,
    },
    api: {
      port: env.PORT ?? env.API_PORT,
    },
    database: {
      url: env.DATABASE_URL,
    },
    redis: {
      url: env.REDIS_URL,
    },
    meili: {
      url: readFirst(env, ["MEILI_URL", "MEILISEARCH_URL", "MEILISEARCH_HOST"]),
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      jwtExpiresIn: env.JWT_EXPIRES_IN,
    },
    storage: {
      endpoint: env.STORAGE_ENDPOINT,
      bucket: env.STORAGE_BUCKET,
      accessKey: env.STORAGE_ACCESS_KEY,
      secretKey: env.STORAGE_SECRET_KEY,
      region: env.STORAGE_REGION,
    },
    ai: {
      openaiApiKey: readFirst(env, ["OPENAI_API_KEY", "OPENAI_KEY"]),
      openaiBaseUrl: env.OPENAI_BASE_URL,
      googleApiKey: env.GOOGLE_API_KEY,
      defaultModel: env.AI_DEFAULT_MODEL,
    },
    crawler: {
      userAgent: env.CRAWLER_USER_AGENT,
      concurrency: env.CRAWLER_CONCURRENCY,
      timeoutMs: env.CRAWLER_TIMEOUT_MS,
    },
    queue: {
      url: env.QUEUE_URL,
    },
    log: {
      level: env.LOG_LEVEL,
    },
    site: {
      name: env.SITE_NAME,
      description: env.SITE_DESCRIPTION,
      defaultLocale: env.DEFAULT_LOCALE,
    },
  };

  return configSchema.parse(raw);
}
