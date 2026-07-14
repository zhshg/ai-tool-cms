import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "futurepedia", "export-futurepedia-all.ts");
const tsconfigPath = path.join(root, "packages", "auto-update", "tsconfig.runtime.json");

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", scriptPath, ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: tsconfigPath,
    },
  },
);

process.exit(result.status ?? 1);
