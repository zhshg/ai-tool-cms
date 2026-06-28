import { createLogger } from "./create-logger";
import type { Logger, LoggerOptions } from "./types";
import { LoggerKind } from "./types";

export function createApiLogger(options: LoggerOptions = { service: "api" }): Logger {
  return createLogger(options).child({
    kind: LoggerKind.App,
  });
}
