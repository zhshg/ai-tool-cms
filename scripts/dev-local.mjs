#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, options = {}) {
  const label = [command, ...args].join(" ");
  console.log(`\n> ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${label}`);
  }
}

function ensureEnvFile() {
  const envPath = resolve(root, ".env");
  const examplePath = resolve(root, ".env.example");

  if (existsSync(envPath)) {
    return;
  }

  if (!existsSync(examplePath)) {
    throw new Error("Missing .env.example — cannot bootstrap .env");
  }

  copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
}

function hasDocker() {
  const result = spawnSync("docker", ["compose", "version"], {
    cwd: root,
    stdio: "ignore",
  });

  return result.status === 0;
}

function startInfrastructure() {
  if (!hasDocker()) {
    console.warn("Docker 不可用，跳过基础设施启动（仅启动 web + api）");
    return;
  }

  try {
    run("docker", ["compose", "up", "-d", "--wait"]);
  } catch (error) {
    console.warn("Docker 启动失败，继续启动应用：", error.message);
  }
}

function startApps() {
  const child = spawn(
    "pnpm",
    ["turbo", "run", "dev", "--filter=@ai-tool-cms/web", "--filter=@ai-tool-cms/api"],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

ensureEnvFile();
startInfrastructure();
startApps();
