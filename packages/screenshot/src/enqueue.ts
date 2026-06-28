import { AUTOMATION_QUEUE_NAMES, enqueueAutomationJob } from "@ai-tool-cms/queue";

export async function enqueueScreenshotCapture(
  toolId: string,
  variants?: Array<"DESKTOP" | "MOBILE" | "DARK">,
): Promise<string> {
  return enqueueAutomationJob(AUTOMATION_QUEUE_NAMES.SCREENSHOT_CAPTURE, "screenshot", {
    toolId,
    variants,
  });
}
