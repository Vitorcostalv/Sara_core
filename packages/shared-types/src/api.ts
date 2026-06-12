export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiItemResponse<TData> {
  data: TData;
}

export interface PaginatedResponse<TData> {
  data: TData[];
  meta: PaginationMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown | null;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface HealthStatusResponse {
  status: "ok";
  service: string;
  environment: "development" | "test" | "production";
  timestamp: string;
}

export interface IdPathParam {
  id: string;
}
