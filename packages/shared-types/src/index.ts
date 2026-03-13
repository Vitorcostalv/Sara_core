export * from "./domain";
export * from "./api";
export * from "./client";

export type ApiListResponse<TData> = import("./api").PaginatedResponse<TData>;
