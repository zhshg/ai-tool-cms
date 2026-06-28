import { Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger, type Logger } from "@ai-tool-cms/logger";

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(private readonly configService: ConfigService) {
    this.logger = createLogger({
      service: "api",
      level: this.configService.get("log.level"),
    });
  }

  log(message: string, context?: string): void {
    this.logger.info(message, context ? { context } : undefined);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context ? { context } : undefined);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context ? { context } : undefined);
  }

  verbose(message: string, context?: string): void {
    this.logger.trace(message, context ? { context } : undefined);
  }

  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }
}
