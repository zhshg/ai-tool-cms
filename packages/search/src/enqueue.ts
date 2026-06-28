import { SEARCH_QUEUE_NAMES, enqueueSearchJob } from "@ai-tool-cms/queue";
import type { IndexToolPayload } from "./types";

export async function enqueueSearchIndex(
  toolId: string,
  reason: IndexToolPayload["reason"] = "tool_update",
): Promise<string> {
  return enqueueSearchJob(SEARCH_QUEUE_NAMES.TOOL_INDEX, "index-tool", { toolId, reason });
}
