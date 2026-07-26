import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRunArtifactPaths } from "./persistence";

describe("buildRunArtifactPaths", () => {
  it("stores all crawler artifacts under storage so production volumes can persist them", () => {
    const root = path.join("workspace");
    const paths = buildRunArtifactPaths(root, "2026-07-09-073145-futurepedia");

    expect(paths.snapshot).toBe(
      path.join(
        root,
        "storage",
        "auto-update",
        "candidates",
        "auto-update-2026-07-09-073145-futurepedia.json",
      ),
    );
    expect(paths.report).toBe(
      path.join(
        root,
        "storage",
        "auto-update",
        "reports",
        "auto-update-2026-07-09-073145-futurepedia.md",
      ),
    );
    expect(paths.log).toBe(
      path.join(root, "storage", "auto-update", "logs", "2026-07-09-073145-futurepedia.log"),
    );
  });
});
