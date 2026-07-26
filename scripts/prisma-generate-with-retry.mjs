import { spawn } from "node:child_process";

const maxAttempts = Number.parseInt(process.env.PRISMA_GENERATE_MAX_ATTEMPTS ?? "5", 10);
const baseDelayMs = Number.parseInt(process.env.PRISMA_GENERATE_RETRY_DELAY_MS ?? "5000", 10);
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runPrismaGenerate() {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
    const args =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "pnpm exec prisma generate"]
        : ["exec", "prisma", "generate"];

    const child = spawn(command, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        PRISMA_HIDE_UPDATE_MESSAGE: process.env.PRISMA_HIDE_UPDATE_MESSAGE ?? "1",
        PRISMA_GENERATE_SKIP_AUTOINSTALL: process.env.PRISMA_GENERATE_SKIP_AUTOINSTALL ?? "1",
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `prisma generate terminated by signal ${signal}`
            : `prisma generate exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    if (attempt > 1) {
      console.log(`[prisma-generate] retry attempt ${attempt}/${maxAttempts}`);
    } else {
      console.log(`[prisma-generate] attempt ${attempt}/${maxAttempts}`);
    }

    await runPrismaGenerate();
    console.log("[prisma-generate] completed successfully");
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (attempt >= maxAttempts) {
      console.error(`[prisma-generate] failed after ${attempt} attempts: ${message}`);
      process.exit(1);
    }

    const delayMs = baseDelayMs * attempt;
    console.warn(
      `[prisma-generate] attempt ${attempt}/${maxAttempts} failed: ${message}. Retrying in ${delayMs}ms...`,
    );
    await sleep(delayMs);
  }
}
