import { registerAs } from "@nestjs/config";

export const authConfig = registerAs("auth", () => ({
  jwtSecret: process.env.JWT_SECRET ?? "development-jwt-secret",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
}));
