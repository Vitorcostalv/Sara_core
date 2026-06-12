export * from "./api";

export type ApiListResponse<TData> = import("./api").PaginatedResponse<TData>;
