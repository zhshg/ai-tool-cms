import type { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from "pino";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LoggerOptions {
  service: string;
  level?: LogLevel;
  bindings?: Record<string, unknown>;
  pino?: Omit<PinoLoggerOptions, "level" | "base">;
}

export interface Logger {
  fatal(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  trace(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
  raw: PinoLogger;
}

export const LoggerKind = {
  App: "app",
  Request: "request",
  Worker: "worker",
  Crawler: "crawler",
} as const;

export type LoggerKind = (typeof LoggerKind)[keyof typeof LoggerKind];
