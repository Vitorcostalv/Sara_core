import type {
  ApiErrorResponse,
  CreateConversationTurnRequest,
  CreateFactRequest,
  CreateTaskRequest,
  CreateToolCallRequest,
  ConversationTurnResponse,
  ConversationTurnsListResponse,
  FactsListResponse,
  FactResponse,
  HealthStatusResponse,
  ListConversationTurnsQuery,
  ListFactsQuery,
  ListTasksQuery,
  ListToolCallsQuery,
  MarkFactImportantRequest,
  TaskResponse,
  TasksListResponse,
  ToolCallResponse,
  ToolCallsListResponse,
  UpdateFactRequest,
  UpdateTaskRequest,
  UpdateToolCallStatusRequest,
  UpdateUserProfileRequest,
  UserProfileResponse,
} from "@sara/shared-types";
import { withQuery } from "@sara/shared-types";
import { useUiStore } from "../../state/ui.store";

const fallbackApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";

function getApiBaseUrl(): string {
  const configured = useUiStore.getState().apiBaseUrl?.trim();
  return configured && configured.length > 0 ? configured : fallbackApiBaseUrl;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: ApiErrorResponse | null,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function getApiErrorMessage(error: unknown): string {
  if (isApiClientError(error)) {
    return error.payload?.error.message ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected request error";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: options.method ?? "GET",
    headers:
      options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = (await response.json()) as ApiErrorResponse;
    } catch {
      errorPayload = null;
    }
    throw new ApiClientError(
      response.status,
      errorPayload,
      errorPayload?.error.message ?? `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const healthApi = {
  getStatus: () => request<HealthStatusResponse>("/health"),
};

export const tasksApi = {
  list: (query: ListTasksQuery) =>
    request<TasksListResponse>(
      withQuery("/tasks", query as Record<string, string | number | boolean | null | undefined>)
    ),
  getById: (id: string) => request<TaskResponse>(`/tasks/${id}`),
  create: (payload: CreateTaskRequest) =>
    request<TaskResponse>("/tasks", { method: "POST", body: payload }),
  update: (id: string, payload: UpdateTaskRequest) =>
    request<TaskResponse>(`/tasks/${id}`, { method: "PATCH", body: payload }),
  complete: (id: string) =>
    request<TaskResponse>(`/tasks/${id}/complete`, { method: "PATCH" }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
};

export const factsApi = {
  list: (query: ListFactsQuery) =>
    request<FactsListResponse>(
      withQuery("/facts", query as Record<string, string | number | boolean | null | undefined>)
    ),
  getById: (id: string) => request<FactResponse>(`/facts/${id}`),
  create: (payload: CreateFactRequest) =>
    request<FactResponse>("/facts", { method: "POST", body: payload }),
  update: (id: string, payload: UpdateFactRequest) =>
    request<FactResponse>(`/facts/${id}`, { method: "PATCH", body: payload }),
  markImportant: (id: string, payload: MarkFactImportantRequest) =>
    request<FactResponse>(`/facts/${id}/important`, { method: "PATCH", body: payload }),
  remove: (id: string) => request<void>(`/facts/${id}`, { method: "DELETE" }),
};

export const conversationTurnsApi = {
  list: (query: ListConversationTurnsQuery) =>
    request<ConversationTurnsListResponse>(
      withQuery(
        "/conversation-turns",
        query as Record<string, string | number | boolean | null | undefined>
      )
    ),
  getById: (id: string) =>
    request<ConversationTurnResponse>(`/conversation-turns/${id}`),
  create: (payload: CreateConversationTurnRequest) =>
    request<ConversationTurnResponse>("/conversation-turns", {
      method: "POST",
      body: payload,
    }),
};

export const toolCallsApi = {
  list: (query: ListToolCallsQuery) =>
    request<ToolCallsListResponse>(
      withQuery(
        "/tool-calls",
        query as Record<string, string | number | boolean | null | undefined>
      )
    ),
  getById: (id: string) => request<ToolCallResponse>(`/tool-calls/${id}`),
  create: (payload: CreateToolCallRequest) =>
    request<ToolCallResponse>("/tool-calls", { method: "POST", body: payload }),
  updateStatus: (id: string, payload: UpdateToolCallStatusRequest) =>
    request<ToolCallResponse>(`/tool-calls/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),
};

export const userProfileApi = {
  get: () => request<UserProfileResponse>("/user-profile"),
  update: (payload: UpdateUserProfileRequest) =>
    request<UserProfileResponse>("/user-profile", {
      method: "PATCH",
      body: payload,
    }),
};