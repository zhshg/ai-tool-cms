import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findWorkspaceRoot } from "@ai-tool-cms/config";
import type { PersistedCandidateSnapshot } from "./types";

function ensureDir(target: string) {
  mkdirSync(target, { recursive: true });
}

export function writeCandidateSnapshot(date: string, data: PersistedCandidateSnapshot): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "storage", "auto-update", "candidates");
  ensureDir(dir);
  const filePath = path.join(dir, `auto-update-${date}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

export function writeLog(date: string, lines: string[]): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "logs", "auto-update");
  ensureDir(dir);
  const filePath = path.join(dir, `${date}.log`);
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

export function writeReport(date: string, markdown: string): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "docs", "operations", "reports");
  ensureDir(dir);
  const filePath = path.join(dir, `auto-update-${date}.md`);
  writeFileSync(filePath, markdown, "utf8");
  return filePath;
}
