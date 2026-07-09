import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as configPkg from "@ai-tool-cms/config";

const { findWorkspaceRoot } = configPkg;

function ensureDir(target: string) {
  mkdirSync(target, { recursive: true });
}

function sanitizeSegment(value: string): string {
  return value
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildRunArtifactId(date: string, sourceIds: string[], generatedAt: string): string {
  const time = generatedAt.slice(11, 19).replace(/:/g, "");
  const sourceLabel =
    sourceIds.length === 1
      ? sanitizeSegment(sourceIds[0] ?? "all")
      : sourceIds.length <= 3
        ? sanitizeSegment(sourceIds.join("-"))
        : `multi-${sourceIds.length}`;
  return `${date}-${time}-${sourceLabel}`;
}

export function buildRunArtifactPaths(root: string, runId: string) {
  const baseDir = path.join(root, "storage", "auto-update");

  return {
    snapshot: path.join(baseDir, "candidates", `auto-update-${runId}.json`),
    report: path.join(baseDir, "reports", `auto-update-${runId}.md`),
    log: path.join(baseDir, "logs", `${runId}.log`),
  };
}

export function writeCandidateSnapshot<T>(runId: string, data: T): string {
  const root = findWorkspaceRoot();
  const filePath = buildRunArtifactPaths(root, runId).snapshot;
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

export function writeLog(runId: string, lines: string[]): string {
  const root = findWorkspaceRoot();
  const filePath = buildRunArtifactPaths(root, runId).log;
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

export function writeReport(runId: string, markdown: string): string {
  const root = findWorkspaceRoot();
  const filePath = buildRunArtifactPaths(root, runId).report;
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, markdown, "utf8");
  return filePath;
}
