import { describe, expect, it } from "vitest";
import type { Role } from "./role";

describe("Role type", () => {
  it("accepts a valid role shape", () => {
    const role: Role = {
      id: "role-1",
      code: "admin",
      name: "Administrator",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(role.code).toBe("admin");
  });
});
