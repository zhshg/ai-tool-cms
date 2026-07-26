import { describe, expect, it } from "vitest";
import { extractImportJsonRecords } from "./tool-import";

describe("extractImportJsonRecords", () => {
  it("returns top-level arrays unchanged", () => {
    const records = [{ name: "n8n" }];

    expect(extractImportJsonRecords(records)).toEqual(records);
  });

  it("extracts records from wrapped items payloads", () => {
    const records = [{ name: "n8n" }];

    expect(
      extractImportJsonRecords({
        source: "futurepedia",
        total: 1,
        items: records,
      }),
    ).toEqual(records);
  });

  it("returns null for unsupported json shapes", () => {
    expect(extractImportJsonRecords({ source: "futurepedia" })).toBeNull();
    expect(extractImportJsonRecords("invalid")).toBeNull();
  });
});
