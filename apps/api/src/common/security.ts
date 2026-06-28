import type { INestApplication } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { env } from "@ai-tool-cms/config";

/** Security headers — Helmet-equivalent (Commit 103) */
export function applySecurityHeaders(app: INestApplication): void {
  if (env.NODE_ENV === "test") return;

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
}

export function getCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) {
    return env.NODE_ENV === "production" ? [env.APP_URL, env.ADMIN_URL] : true;
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
