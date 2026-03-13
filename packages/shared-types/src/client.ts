import type { PaginationMeta, PaginationQuery } from "./api";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface TypedRequestConfig<TBody = unknown, TQuery extends QueryParams = QueryParams> {
  method: HttpMethod;
  path: string;
  body?: TBody;
  query?: TQuery;
}

export interface TypedRequestResult<TData> {
  status: number;
  data: TData;
}

export function toQueryParams(params?: QueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (!params) {
    return searchParams;
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams;
}

export function withQuery(path: string, params?: QueryParams): string {
  const query = toQueryParams(params).toString();
  return query.length > 0 ? `${path}?${query}` : path;
}

export function normalizePaginationQuery(query?: PaginationQuery): Required<PaginationQuery> {
  return {
    page: query?.page && query.page > 0 ? query.page : 1,
    pageSize: query?.pageSize && query.pageSize > 0 ? query.pageSize : 20
  };
}

export function canGoNextPage(meta: PaginationMeta): boolean {
  return meta.hasNextPage;
}
