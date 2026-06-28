import type { ToolDTO } from "./ToolDTO";
import { defaultDuplicateDetector, type ExistingToolRecord } from "./DuplicateDetector";

export type IngestionResult = {
  created: number;
  updated: number;
  skipped: number;
  duplicates: number;
};

export type ToolPersistence = {
  loadExistingTools(): Promise<ExistingToolRecord[]>;
  findByWebsite(website: string): Promise<{ id: string } | null>;
  createTool(dto: ToolDTO): Promise<{ id: string }>;
  updateTool(id: string, dto: ToolDTO): Promise<void>;
};

/**
 * Ingest normalized ToolDTO records with duplicate detection (Commit 028).
 */
export async function ingestToolDtos(
  persistence: ToolPersistence,
  dtos: ToolDTO[],
): Promise<IngestionResult> {
  const existing = await persistence.loadExistingTools();
  const { unique, duplicates } = defaultDuplicateDetector.filterUnique(dtos, existing);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const dto of unique) {
    const match = await persistence.findByWebsite(dto.website);
    if (match) {
      await persistence.updateTool(match.id, dto);
      updated += 1;
      continue;
    }

    await persistence.createTool(dto);
    created += 1;
  }

  skipped = dtos.length - unique.length - duplicates.length;

  return {
    created,
    updated,
    skipped,
    duplicates: duplicates.length,
  };
}
