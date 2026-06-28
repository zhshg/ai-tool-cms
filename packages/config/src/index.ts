import { parseEnv } from "./parse";
import type { Env } from "./schema";
import { resetDotenvLoader } from "./load-dotenv";

export { parseEnv, parseConfig } from "./parse";
export { loadRootDotenv, findWorkspaceRoot, resetDotenvLoader } from "./load-dotenv";
export { envSchema, configSchema, type Env, type AppConfig } from "./schema";

let cachedEnv: Env | undefined;

export function getEnv(source?: Record<string, string | undefined>): Env {
  if (!cachedEnv) {
    cachedEnv = parseEnv(source);
  }

  return cachedEnv;
}

export function resetEnv(): void {
  cachedEnv = undefined;
  resetDotenvLoader();
}

export const env = getEnv();

/** @deprecated 请改用 `getEnv`。 */
export const getConfig = getEnv;

/** @deprecated 请改用 `resetEnv`。 */
export const resetConfig = resetEnv;

/** @deprecated 请改用 `env`。 */
export default env;
