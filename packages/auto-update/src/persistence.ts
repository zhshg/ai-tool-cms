import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findWorkspaceRoot } from "@ai-tool-cms/config";
import type { PersistedCandidateSnapshot } from "./types";

function ensureDir(target: string) {
  mkdirSync(target, { recursive: true });
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
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

export function writeCandidateSnapshot(runId: string, data: PersistedCandidateSnapshot): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "storage", "auto-update", "candidates");
  ensureDir(dir);
  const filePath = path.join(dir, `auto-update-${runId}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

export function writeLog(runId: string, lines: string[]): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "logs", "auto-update");
  ensureDir(dir);
  const filePath = path.join(dir, `${runId}.log`);
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  return filePath;
}

export function writeReport(runId: string, markdown: string): string {
  const root = findWorkspaceRoot();
  const dir = path.join(root, "docs", "operations", "reports");
  ensureDir(dir);
  const filePath = path.join(dir, `auto-update-${runId}.md`);
  writeFileSync(filePath, markdown, "utf8");
  return filePath;
}
