import { parseConfig } from "./parse";
import type { AppConfig } from "./schema";

let cachedConfig: AppConfig | undefined;

export function getConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  if (!cachedConfig) {
    cachedConfig = parseConfig(env);
  }

  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = undefined;
}

const config = getConfig();

export default config;

export type { AppConfig } from "./schema";
export { configSchema } from "./schema";
export { parseConfig } from "./parse";
