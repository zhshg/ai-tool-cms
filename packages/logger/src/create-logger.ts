import pino, { type Logger as PinoLogger } from "pino";
import type { Logger, LoggerOptions, LogLevel } from "./types";

function resolveLogLevel(level?: LogLevel): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.trim();
  if (level) {
    return level;
  }

  if (
    fromEnv === "fatal" ||
    fromEnv === "error" ||
    fromEnv === "warn" ||
    fromEnv === "info" ||
    fromEnv === "debug" ||
    fromEnv === "trace"
  ) {
    return fromEnv;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function wrapPinoLogger(instance: PinoLogger): Logger {
  const write = (
    level: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
    message: string,
    context?: Record<string, unknown>,
  ) => {
    if (context && Object.keys(context).length > 0) {
      instance[level](context, message);
      return;
    }

    instance[level](message);
  };

  return {
    fatal: (message, context) => write("fatal", message, context),
    error: (message, context) => write("error", message, context),
    warn: (message, context) => write("warn", message, context),
    info: (message, context) => write("info", message, context),
    debug: (message, context) => write("debug", message, context),
    trace: (message, context) => write("trace", message, context),
    child: (bindings) => wrapPinoLogger(instance.child(bindings)),
    raw: instance,
  };
}

export function createLogger(options: LoggerOptions | string): Logger {
  const resolved = typeof options === "string" ? { service: options } : options;

  const instance = pino({
    level: resolveLogLevel(resolved.level),
    base: {
      service: resolved.service,
      ...resolved.bindings,
    },
    ...resolved.pino,
  });

  return wrapPinoLogger(instance);
}
