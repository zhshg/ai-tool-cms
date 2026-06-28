export const ErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  NotFound: "NOT_FOUND",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  Conflict: "CONFLICT",
  InternalError: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
