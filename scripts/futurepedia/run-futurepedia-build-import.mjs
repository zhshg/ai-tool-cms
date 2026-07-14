import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts", "futurepedia", "build-futurepedia-import-json.ts");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", scriptPath, ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
    },
  },
);

process.exit(result.status ?? 1);
