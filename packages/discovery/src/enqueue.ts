import { AUTOMATION_QUEUE_NAMES, enqueueAutomationJob } from "@ai-tool-cms/queue";

export async function enqueueDiscoveryRun(taskId: string): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.DISCOVERY_RUN, "discovery-run", {
    taskId,
  });
}
