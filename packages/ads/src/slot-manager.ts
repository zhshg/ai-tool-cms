import type { PrismaClient } from "@ai-tool-cms/database";
import { renderAdHtml } from "./networks";
import type { AdRenderPayload, AdSlotRecord } from "./types";

function mapSlot(row: {
  id: string;
  slug: string;
  name: string;
  network: AdSlotRecord["network"];
  position: string;
  sortOrder: number;
  config: unknown;
}): AdSlotRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    network: row.network,
    position: row.position,
    sortOrder: row.sortOrder,
    config: (row.config as Record<string, unknown>) ?? {},
  };
}

export async function listActiveAdSlots(prisma: PrismaClient): Promise<AdSlotRecord[]> {
  const rows = await prisma.adSlot.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: [{ position: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map(mapSlot);
}

export async function getAdSlotByPosition(
  prisma: PrismaClient,
  position: string,
): Promise<AdRenderPayload | null> {
  const row = await prisma.adSlot.findFirst({
    where: { position, status: "ACTIVE", deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  if (!row) {
    return null;
  }

  const slot = mapSlot(row);
  const rendered = renderAdHtml(slot.network, slot.config);
  return { slot, ...rendered };
}

export async function listAdsByPosition(
  prisma: PrismaClient,
): Promise<Record<string, AdRenderPayload[]>> {
  const slots = await listActiveAdSlots(prisma);
  const grouped: Record<string, AdRenderPayload[]> = {};

  for (const slot of slots) {
    const rendered = renderAdHtml(slot.network, slot.config);
    const payload: AdRenderPayload = { slot, ...rendered };
    grouped[slot.position] ??= [];
    grouped[slot.position]!.push(payload);
  }

  return grouped;
}
