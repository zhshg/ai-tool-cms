import { createApiLogger } from "./api-logger";

/** 默认日志单例，各 App 统一通过 `import { logger } from "@ai-tool-cms/logger"` 使用。 */
export const logger = createApiLogger({ service: "app" });
