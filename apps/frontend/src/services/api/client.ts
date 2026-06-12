import type { ApiErrorResponse } from "@sara/shared-types";
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
