import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const buildHome = resolve(process.cwd(), "../../.build-home");
mkdirSync(buildHome, { recursive: true });

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    BUILD_SKIP_ENV_VALIDATION: "true",
    HOME: buildHome,
    USERPROFILE: buildHome,
  },
});

process.exit(result.status ?? 1);
