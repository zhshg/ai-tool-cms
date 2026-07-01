import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [, , source, target] = process.argv;

if (!source || !target) {
  console.error("Usage: node scripts/copy-dir.mjs <source> <target>");
  process.exit(1);
}

const sourcePath = resolve(source);
const targetPath = resolve(target);

if (!existsSync(sourcePath)) {
  console.error(`Source directory does not exist: ${sourcePath}`);
  process.exit(1);
}

mkdirSync(dirname(targetPath), { recursive: true });
cpSync(sourcePath, targetPath, { recursive: true, force: true });
