export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
}

export function getPaginationOffset(input: PaginationInput): number {
  return (input.page - 1) * input.pageSize;
}

export function buildPaginationMeta(input: PaginationInput, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / input.pageSize) || 1;

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1
  };
}
