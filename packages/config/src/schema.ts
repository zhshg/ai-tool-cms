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

export const configSchema = z
  .object({
    nodeEnv: nodeEnvSchema,
    app: z.object({
      url: z.string().url().default("http://localhost:3000"),
      adminUrl: z.string().url().default("http://localhost:3001"),
      apiUrl: z.string().url().default("http://localhost:4000"),
    }),
    api: z.object({
      port: z.coerce.number().int().positive().default(4000),
    }),
    database: z.object({
      url: optionalUrl,
    }),
    redis: z.object({
      url: optionalUrl,
    }),
    meili: z.object({
      url: optionalUrl,
    }),
    auth: z.object({
      jwtSecret: optionalString,
      jwtAccessExpiresIn: z.string().default("15m"),
      jwtRefreshSecret: optionalString,
      jwtRefreshExpiresIn: z.string().default("7d"),
      jwtExpiresIn: z.string().default("7d"),
    }),
    storage: z.object({
      endpoint: optionalUrl,
      bucket: z.string().default("ai-tool-cms"),
      accessKey: optionalString,
      secretKey: optionalString,
      region: z.string().default("us-east-1"),
    }),
    ai: z.object({
      openaiApiKey: optionalString,
      openaiBaseUrl: optionalUrl,
      googleApiKey: optionalString,
      defaultModel: z.string().default("gpt-4o-mini"),
    }),
    crawler: z.object({
      userAgent: z.string().default("AI-Tool-CMS-Bot/1.0"),
      concurrency: z.coerce.number().int().positive().default(5),
      timeoutMs: z.coerce.number().int().positive().default(30000),
    }),
    queue: z.object({
      url: optionalUrl,
    }),
    log: z.object({
      level: z.string().default("info"),
    }),
    site: z.object({
      name: z.string().default("AI Tool CMS"),
      description: optionalString,
      defaultLocale: z.string().default("zh-CN"),
    }),
  })
  .superRefine((config, ctx) => {
    if (config.nodeEnv !== "production") {
      return;
    }

    if (!config.database.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL is required in production",
        path: ["database", "url"],
      });
    }

    if (!config.auth.jwtSecret) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET is required in production",
        path: ["auth", "jwtSecret"],
      });
    }
  });

export type AppConfig = z.infer<typeof configSchema>;
