#!/usr/bin/env node
/**
 * Production audit runner — Commit 101
 * Usage: node scripts/audit/production-audit.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const OUT = join(ROOT, "docs/11-production/ProductionAuditReport.json");

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".turbo", "coverage"]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (CODE_EXT.has(name.slice(name.lastIndexOf(".")))) files.push(p);
  }
  return files;
}

function scanPatterns(files) {
  const patterns = {
    todo: /\b(TODO|FIXME)\b/g,
    consoleLog: /\bconsole\.(log|debug)\(/g,
  };
  const hits = { todo: [], consoleLog: [] };
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (rel.startsWith("scripts/audit/")) continue;
    const content = readFileSync(file, "utf8");
    for (const [key, re] of Object.entries(patterns)) {
      const matches = content.match(re);
      if (matches) hits[key].push({ file: rel, count: matches.length });
    }
  }
  return hits;
}

function run(cmd) {
  try {
    return {
      ok: true,
      output: execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }),
    };
  } catch (e) {
    return {
      ok: false,
      output: e.stdout?.toString() ?? "",
      error: e.stderr?.toString() ?? String(e.message),
    };
  }
}

const files = walk(ROOT);
const scan = scanPatterns(files);
const lint = run("pnpm lint 2>&1");
const typecheck = run("pnpm typecheck 2>&1");
const audit = run("pnpm audit --audit-level=high 2>&1");

const report = {
  generatedAt: new Date().toISOString(),
  sprint: "Sprint 11 — Production Readiness",
  filesScanned: files.length,
  scan,
  lint: { passed: lint.ok },
  typecheck: { passed: typecheck.ok },
  dependencyAudit: { passed: audit.ok },
  acceptance: {
    noTodo: scan.todo.length === 0,
    noFixme: scan.todo.length === 0,
    eslintZeroError: lint.ok,
    typescriptZeroError: typecheck.ok,
  },
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.info("[audit] report written to docs/11-production/ProductionAuditReport.json");
console.info(JSON.stringify(report.acceptance, null, 2));
process.exit(report.acceptance.eslintZeroError && report.acceptance.typescriptZeroError ? 0 : 1);
