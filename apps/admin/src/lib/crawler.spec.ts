import { describe, expect, it } from "vitest";
import { getCrawlerRunActionState } from "./crawler";

describe("getCrawlerRunActionState", () => {
  it("returns runnable state for enabled source with permission", () => {
    expect(
      getCrawlerRunActionState(
        { id: "source-1", status: "ENABLED" },
        { activeSourceId: null, canRun: true },
      ),
    ).toEqual({
      disabled: false,
      label: "Run now",
    });
  });

  it("returns queueing state for active source", () => {
    expect(
      getCrawlerRunActionState(
        { id: "source-1", status: "ENABLED" },
        { activeSourceId: "source-1", canRun: true },
      ),
    ).toEqual({
      disabled: true,
      label: "Queueing...",
    });
  });

  it("returns disabled state when source is not enabled", () => {
    expect(
      getCrawlerRunActionState(
        { id: "source-1", status: "PAUSED" },
        { activeSourceId: null, canRun: true },
      ),
    ).toEqual({
      disabled: true,
      label: "Unavailable",
    });
  });

  it("returns permission-limited state when user cannot run crawler", () => {
    expect(
      getCrawlerRunActionState(
        { id: "source-1", status: "ENABLED" },
        { activeSourceId: null, canRun: false },
      ),
    ).toEqual({
      disabled: true,
      label: "No access",
    });
  });
});
