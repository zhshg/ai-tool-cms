import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const steps = [
  {
    title: "list-category-counts",
    command: ["node", path.join(root, "scripts", "ops", "list-category-counts.mjs")],
  },
  {
    title: "reclassify-uncategorized-tools",
    command: ["node", path.join(root, "scripts", "ops", "reclassify-uncategorized-tools.mjs")],
  },
  {
    title: "fill-missing-taxonomy",
    command: ["node", path.join(root, "scripts", "ops", "fill-missing-taxonomy.mjs")],
  },
  {
    title: "fill-missing-logos",
    command: ["node", path.join(root, "scripts", "ops", "fill-missing-logos.mjs")],
  },
  {
    title: "verify-uncategorized-fix",
    command: ["node", path.join(root, "scripts", "ops", "verify-uncategorized-fix.mjs")],
  },
  {
    title: "verify-tool-cleanup",
    command: ["node", path.join(root, "scripts", "ops", "verify-tool-cleanup.mjs")],
  },
  {
    title: "verify-missing-logos",
    command: ["node", path.join(root, "scripts", "ops", "verify-missing-logos.mjs")],
  },
];

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    skipLogo: argv.includes("--skip-logo"),
    skipVerification: argv.includes("--skip-verify"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const executed = [];

  for (const step of steps) {
    if (options.skipLogo && step.title === "fill-missing-logos") {
      continue;
    }

    if (options.skipVerification && step.title.startsWith("verify-")) {
      continue;
    }

    const stepArgs = [...step.command];
    if (
      options.dryRun &&
      !step.title.startsWith("verify-") &&
      step.title !== "list-category-counts"
    ) {
      stepArgs.push("--dry-run");
    }

    console.log(`==> ${step.title}`);
    const result = spawnSync(stepArgs[0], stepArgs.slice(1), {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
      },
    });

    executed.push({ title: step.title, status: result.status ?? 1 });

    if ((result.status ?? 1) !== 0) {
      console.error(
        JSON.stringify({ dryRun: options.dryRun, failedStep: step.title, executed }, null, 2),
      );
      process.exit(result.status ?? 1);
    }
  }

  console.log(JSON.stringify({ dryRun: options.dryRun, executed }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
