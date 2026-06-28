import { HTTP_STATUS } from "../constants";
import { ErrorCode, type ApiErrorBody } from "./error-codes";

export { ErrorCode, type ApiErrorBody } from "./error-codes";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = HTTP_STATUS.internalServerError,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.ValidationError, message, HTTP_STATUS.badRequest, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.NotFound, message, HTTP_STATUS.notFound, details);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(ErrorCode.Unauthorized, message, HTTP_STATUS.unauthorized);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(ErrorCode.Forbidden, message, HTTP_STATUS.forbidden);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.Conflict, message, HTTP_STATUS.conflict, details);
    this.name = "ConflictError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toApiErrorBody(error: unknown): ApiErrorBody {
  if (isAppError(error)) {
    return error.toJSON();
  }

  return {
    code: ErrorCode.InternalError,
    message: error instanceof Error ? error.message : "Internal server error",
  };
}
