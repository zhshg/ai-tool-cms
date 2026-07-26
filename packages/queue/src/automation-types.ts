export const AUTOMATION_QUEUE_NAMES = {
  DISCOVERY_RUN: "automation-discovery-run",
  WEBSITE_MONITOR: "automation-website-monitor",
  PRICE_MONITOR: "automation-price-monitor",
  SCREENSHOT_CAPTURE: "automation-screenshot-capture",
  TOOL_LOGO_COLLECT: "automation-tool-logo-collect",
  LINK_CHECK: "automation-link-check",
  AI_REFRESH: "automation-ai-refresh",
  SOCIAL_POST: "automation-social-post",
  NEWSLETTER_AUTO: "automation-newsletter-auto",
  INDEX_SUBMIT: "automation-index-submit",
} as const;

export type AutomationQueueName =
  (typeof AUTOMATION_QUEUE_NAMES)[keyof typeof AUTOMATION_QUEUE_NAMES];

export type DiscoveryRunJobPayload = {
  taskId: string;
};

export type WebsiteMonitorJobPayload = {
  monitorId: string;
};

export type PriceMonitorJobPayload = {
  monitorId: string;
};

export type ScreenshotCaptureJobPayload = {
  toolId: string;
  variants?: Array<"DESKTOP" | "MOBILE" | "DARK">;
};

export type ToolLogoCollectJobPayload = {
  toolId: string;
  force?: boolean;
};

export type LinkCheckJobPayload = {
  targetType: string;
  targetId: string;
  url: string;
};

export type AiRefreshJobPayload = {
  scheduleId: string;
  toolId: string;
};

export type SocialPostJobPayload = {
  postId: string;
};

export type NewsletterAutoJobPayload = {
  campaignType: string;
  categoryId?: string;
};

export type IndexSubmitJobPayload = {
  submissionId: string;
  url: string;
  provider: "GOOGLE" | "BING";
};

export type AutomationQueuePayloadMap = {
  [AUTOMATION_QUEUE_NAMES.DISCOVERY_RUN]: DiscoveryRunJobPayload;
  [AUTOMATION_QUEUE_NAMES.WEBSITE_MONITOR]: WebsiteMonitorJobPayload;
  [AUTOMATION_QUEUE_NAMES.PRICE_MONITOR]: PriceMonitorJobPayload;
  [AUTOMATION_QUEUE_NAMES.SCREENSHOT_CAPTURE]: ScreenshotCaptureJobPayload;
  [AUTOMATION_QUEUE_NAMES.TOOL_LOGO_COLLECT]: ToolLogoCollectJobPayload;
  [AUTOMATION_QUEUE_NAMES.LINK_CHECK]: LinkCheckJobPayload;
  [AUTOMATION_QUEUE_NAMES.AI_REFRESH]: AiRefreshJobPayload;
  [AUTOMATION_QUEUE_NAMES.SOCIAL_POST]: SocialPostJobPayload;
  [AUTOMATION_QUEUE_NAMES.NEWSLETTER_AUTO]: NewsletterAutoJobPayload;
  [AUTOMATION_QUEUE_NAMES.INDEX_SUBMIT]: IndexSubmitJobPayload;
};
