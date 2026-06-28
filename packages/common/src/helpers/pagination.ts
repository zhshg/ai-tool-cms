import { PAGINATION } from "../constants";

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function normalizePagination(input: PaginationInput = {}): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(PAGINATION.defaultPage, input.page ?? PAGINATION.defaultPage);
  const limit = Math.min(
    PAGINATION.maxLimit,
    Math.max(1, input.limit ?? PAGINATION.defaultLimit),
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: PaginationInput = {},
): PaginatedResult<T> {
  const { page, limit } = normalizePagination(pagination);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
