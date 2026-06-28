import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

let loaded = false;

export function findWorkspaceRoot(startDir = process.cwd()): string {
  let dir = startDir;

  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return startDir;
    }

    dir = parent;
  }
}

/** 从 monorepo 根目录加载 `.env`，确保 `parseEnv()` 早于 Nest/Next 也能读到配置。 */
export function loadRootDotenv(): void {
  if (loaded) {
    return;
  }

  const root = findWorkspaceRoot();
  const envPath = resolve(root, ".env");

  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }

  loaded = true;
}

/** 仅用于测试：允许重新加载 `.env`。 */
export function resetDotenvLoader(): void {
  loaded = false;
}
