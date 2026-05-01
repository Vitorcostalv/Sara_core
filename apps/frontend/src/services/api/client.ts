import type {
  ApiErrorResponse,
  CreateConversationTurnRequest,
  CreateFactRequest,
  GenerateLlmRequest,
  CreateTaskRequest,
  CreateToolCallRequest,
  ConversationTurnResponse,
  ConversationTurnsListResponse,
  FactsListResponse,
  FactResponse,
  HealthStatusResponse,
  LlmGenerateResponse,
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
const optionalApiAuthKey = import.meta.env.VITE_API_AUTH_KEY?.trim() || "";

function getApiBaseUrl(): string {
  const configured = useUiStore.getState().apiBaseUrl?.trim();
  return configured && configured.length > 0 ? configured : fallbackApiBaseUrl;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

export function buildApiHeaders(headers: HeadersInit = {}): Headers {
  const nextHeaders = new Headers(headers);

  if (optionalApiAuthKey.length > 0) {
    nextHeaders.set("x-sara-api-key", optionalApiAuthKey);
  }

  return nextHeaders;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: ApiErrorResponse | null,
    public readonly retryAfterSeconds: number | null,
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
    if (error.status === 401) {
      return "Acesso negado pela API. Verifique a chave de integracao configurada para este ambiente.";
    }

    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `Limite temporario atingido. Tente novamente em cerca de ${error.retryAfterSeconds}s.`
        : "Limite temporario atingido. Aguarde um pouco antes de tentar novamente.";
    }

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

async function readApiErrorPayload(response: Response): Promise<ApiErrorResponse | null> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildApiUrl(endpoint), {
    method: options.method ?? "GET",
    headers:
      options.body !== undefined ? buildApiHeaders({ "Content-Type": "application/json" }) : buildApiHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorPayload = await readApiErrorPayload(response);
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds =
      retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number.parseInt(retryAfterHeader, 10) : null;
    throw new ApiClientError(
      response.status,
      errorPayload,
      retryAfterSeconds,
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

export const llmApi = {
  generate: (payload: GenerateLlmRequest) =>
    request<LlmGenerateResponse>("/llm/generate", { method: "POST", body: payload }),
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
