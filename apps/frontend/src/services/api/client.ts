import type { ApiErrorResponse } from "@sara/shared-types";
import { useUiStore } from "../../state/ui.store";
import { getRuntimeApiBaseUrl } from "./runtime";

const fallbackApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";
const defaultTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 12000);

function getApiBaseUrl(): string {
  const runtime = getRuntimeApiBaseUrl();
  if (runtime) return runtime;
  const configured = useUiStore.getState().apiBaseUrl?.trim();
  return configured && configured.length > 0 ? configured : fallbackApiBaseUrl;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
}

export function buildApiHeaders(headers: HeadersInit = {}): Headers {
  return new Headers(headers);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = defaultTimeoutMs
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function checkApiHealth(timeoutMs = 3000): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(buildApiUrl("/health"), {}, timeoutMs);
    if (!response.ok) return false;
    const status = await response.json() as { status?: string; database?: { ok?: boolean } };
    return status.status === "ok" && status.database?.ok === true;
  } catch {
    return false;
  }
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
    if (error.payload?.error?.code === "LLM_QUOTA_EXCEEDED") return error.payload.error.message;
    if (error.payload?.error?.code === "VALIDATION_ERROR") {
      const details = error.payload.error.details as { fieldErrors?: Record<string, string[]> } | null;
      const messages = Object.values(details?.fieldErrors ?? {}).flat().filter(value => typeof value === "string");
      return `Dados inválidos (HTTP ${error.status}). ${messages.join(" ") || "Confira os campos informados."}`;
    }
    if (error.payload?.error?.code === "FORECAST_SPECIES_UNKNOWN") {
      return `Espécie inexistente no catálogo (HTTP ${error.status}). ${error.payload.error.message}`;
    }
    if (error.status === 401) {
      return "Acesso negado pela API. Verifique a chave de integração configurada para este ambiente.";
    }

    if (error.status === 429) {
      return error.retryAfterSeconds
        ? `Limite temporário atingido. Tente novamente em cerca de ${error.retryAfterSeconds}s.`
        : "Limite temporário atingido. Aguarde um pouco antes de tentar novamente.";
    }

    return error.payload?.error?.message ?? error.message;
  }
  if (error instanceof SyntaxError) return "JSON inválido. Confira a sintaxe antes de gerar a previsão.";
  if (error instanceof TypeError) return "Não foi possível conectar à API após a tentativa de envio. Confira sua conexão e tente novamente; não houve confirmação de resposta do servidor.";
  if (error instanceof Error && error.name === "AbortError") return "A API não respondeu no tempo limite. Tente novamente.";
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected request error";
}
