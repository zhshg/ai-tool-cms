export const API_VERSION = "v1";

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const SLUG = {
  maxLength: 120,
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

export const RATING = {
  min: 1,
  max: 5,
} as const;

export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessableEntity: 422,
  internalServerError: 500,
} as const;
