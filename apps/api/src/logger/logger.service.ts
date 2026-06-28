import { Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import pino, { type Logger as PinoLogger } from "pino";

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: PinoLogger;

  constructor(private readonly configService: ConfigService) {
    this.logger = pino({
      level: this.configService.get<string>("log.level", "info"),
      base: { service: "api" },
    });
  }

  log(message: string, context?: string): void {
    this.write("info", message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.write("warn", message, context);
  }

  debug(message: string, context?: string): void {
    this.write("debug", message, context);
  }

  verbose(message: string, context?: string): void {
    this.write("trace", message, context);
  }

  child(bindings: Record<string, unknown>): PinoLogger {
    return this.logger.child(bindings);
  }

  private write(
    level: "info" | "warn" | "debug" | "trace",
    message: string,
    context?: string,
  ): void {
    this.logger[level]({ context }, message);
  }
}
