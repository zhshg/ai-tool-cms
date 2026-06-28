#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");
const examplePath = resolve(root, ".env.example");

if (existsSync(envPath)) {
  console.log(".env already exists");
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error("Missing .env.example");
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log("Created .env from .env.example");
