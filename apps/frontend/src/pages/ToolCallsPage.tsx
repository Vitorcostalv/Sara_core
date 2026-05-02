import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  Code,
  PlayCircle,
  Pulse,
  WarningCircle,
  Wrench
} from "@phosphor-icons/react";
import type {
  JsonValue,
  PaginationMeta,
  ToolCallStatus,
  ToolCall,
  ToolCallsListResponse
} from "@sara/shared-types";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PageHeader,
  PaginationControls,
  Select,
  StatusPill,
  TextArea
} from "../components/ui";
import { getApiErrorMessage, toolCallsApi } from "../services/api/client";
import { formatDateTime, formatDurationMs } from "../utils/format";
import { getToolCallStatusTone } from "../utils/status";

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

interface ToolCallFilters {
  status: "" | ToolCallStatus;
  conversationTurnId: string;
}

interface ToolCallForm {
  conversationTurnId: string;
  toolName: string;
  status: ToolCallStatus;
  inputPayload: string;
}

const initialForm: ToolCallForm = {
  conversationTurnId: "",
  toolName: "",
  status: "running",
  inputPayload: "{}"
};

const toolCallsPageSize = 10;
const toolCallsCacheTtlMs = 30_000;
const toolCallsCache = new Map<
  string,
  {
    timestamp: number;
    response: ToolCallsListResponse;
  }
>();

function previewJson(value: JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return "null";
  }

  return JSON.stringify(value, null, 2);
}

function buildToolCallsCacheKey(page: number, filters: ToolCallFilters) {
  return JSON.stringify({
    page,
    pageSize: toolCallsPageSize,
    status: filters.status || "",
    conversationTurnId: filters.conversationTurnId.trim().toLowerCase()
  });
}

export function ToolCallsPage() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ToolCallFilters>({ status: "", conversationTurnId: "" });
  const [appliedFilters, setAppliedFilters] = useState<ToolCallFilters>({ status: "", conversationTurnId: "" });
  const [form, setForm] = useState<ToolCallForm>(initialForm);

  const loadToolCalls = useCallback(
    async (nextPage = 1, options?: { force?: boolean; filters?: ToolCallFilters }) => {
      const nextFilters = options?.filters ?? appliedFilters;
      const cacheKey = buildToolCallsCacheKey(nextPage, nextFilters);
      const cached = toolCallsCache.get(cacheKey);

      if (!options?.force && cached && Date.now() - cached.timestamp < toolCallsCacheTtlMs) {
        setToolCalls(cached.response.data);
        setMeta(cached.response.meta);
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await toolCallsApi.list({
          page: nextPage,
          pageSize: toolCallsPageSize,
          status: nextFilters.status || undefined,
          conversationTurnId: nextFilters.conversationTurnId.trim() || undefined
        });

        toolCallsCache.set(cacheKey, {
          timestamp: Date.now(),
          response
        });
        setToolCalls(response.data);
        setMeta(response.meta);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters]
  );

  useEffect(() => {
    void loadToolCalls(page);
  }, [loadToolCalls, page]);

  const applyFilters = () => {
    setAppliedFilters({
      status: filters.status,
      conversationTurnId: filters.conversationTurnId
    });
    setPage(1);
  };

  const clearFilters = () => {
    const nextFilters = { status: "", conversationTurnId: "" } satisfies ToolCallFilters;
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
    void loadToolCalls(1, { force: true, filters: nextFilters });
  };

  const onCreateToolCall = async () => {
    if (!form.conversationTurnId.trim() || !form.toolName.trim()) {
      setErrorMessage("conversationTurnId e toolName sao obrigatorios.");
      return;
    }

    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(form.inputPayload);
    } catch {
      setErrorMessage("O payload de entrada precisa ser JSON valido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await toolCallsApi.create({
        conversationTurnId: form.conversationTurnId.trim(),
        toolName: form.toolName.trim(),
        status: form.status,
        inputPayload: parsedPayload as JsonValue
      });

      toolCallsCache.clear();
      setForm(initialForm);
      setSuccessMessage("Registro criado com sucesso.");
      setPage(1);
      await loadToolCalls(1, { force: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSetStatus = async (toolCall: ToolCall, status: ToolCallStatus) => {
    setSuccessMessage(null);

    try {
      await toolCallsApi.updateStatus(toolCall.id, {
        status,
        durationMs: toolCall.durationMs ?? 0,
        outputPayload: toolCall.outputPayload
      });

      toolCallsCache.clear();
      setSuccessMessage(`Status atualizado para ${status}.`);
      await loadToolCalls(page, { force: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const successCount = toolCalls.filter((toolCall) => toolCall.status === "success").length;
  const errorCount = toolCalls.filter((toolCall) => toolCall.status === "error").length;
  const runningCount = toolCalls.filter((toolCall) => toolCall.status === "running").length;

  return (
    <div className="page-stack">
      <PageHeader
        title="Trilha de execucao"
        description="Aqui voce acompanha as acoes internas executadas pelo sistema e o rastreamento tecnico de cada processamento."
        icon={<PlayCircle weight="duotone" />}
      />

      <section className="tool-hero">
        <div className="tool-hero__stats">
          <div className="signal-metric">
            <span>Visiveis</span>
            <strong>{toolCalls.length}</strong>
            <small>{meta.total} no total</small>
          </div>
          <div className="signal-metric">
            <span>Concluidas</span>
            <strong>{successCount}</strong>
            <small>execucoes finalizadas</small>
          </div>
          <div className="signal-metric">
            <span>Com erro</span>
            <strong>{errorCount}</strong>
            <small>precisam de revisao</small>
          </div>
          <div className="signal-metric">
            <span>Em andamento</span>
            <strong>{runningCount}</strong>
            <small>aguardando retorno</small>
          </div>
        </div>
      </section>

      <div className="tool-layout">
        <section className="signal-panel" data-testid="toolcalls-trace-panel">
          <div className="signal-panel__header">
            <div>
              <h3>Atividade recente</h3>
              <p>Uma visao clara das execucoes internas, util para acompanhamento e debug.</p>
            </div>
          </div>

          <FilterBar
            actions={
              <>
                <Button variant="secondary" onClick={applyFilters} disabled={isLoading}>
                  Aplicar filtros
                </Button>
                <Button variant="secondary" onClick={() => void loadToolCalls(page, { force: true })} disabled={isLoading}>
                  Atualizar
                </Button>
                <Button variant="ghost" onClick={clearFilters}>
                  Limpar
                </Button>
              </>
            }
          >
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value as ToolCallFilters["status"] }))
              }
            >
              <option value="">Todos</option>
              <option value="running">running</option>
              <option value="success">success</option>
              <option value="error">error</option>
            </Select>
            <Input
              label="Conversation Turn ID"
              value={filters.conversationTurnId}
              onChange={(event) => setFilters((current) => ({ ...current, conversationTurnId: event.target.value }))}
              placeholder="UUID"
            />
          </FilterBar>

          {errorMessage ? (
            <ErrorState
              title="Nao foi possivel carregar a trilha"
              message={errorMessage}
              onRetry={() => void loadToolCalls(page, { force: true })}
            />
          ) : null}
          {successMessage ? (
            <div className="signal-message signal-message--success">
              <CheckCircle weight="duotone" />
              <div>
                <strong>Atualizacao concluida</strong>
                <span>{successMessage}</span>
              </div>
            </div>
          ) : null}
          {isLoading ? <LoadingBlock label="Carregando execucoes..." /> : null}
          {!isLoading && !errorMessage && toolCalls.length === 0 ? (
            <EmptyState
              icon={<Pulse weight="duotone" />}
              title="Nenhuma execucao encontrada"
              description="As acoes internas do sistema aparecerao aqui assim que houver atividade."
            />
          ) : null}
          {!isLoading && !errorMessage && toolCalls.length > 0 ? (
            <>
              <div className="tool-trace-list" data-testid="toolcalls-trace-list">
                {toolCalls.map((toolCall) => (
                  <article key={toolCall.id} className="trace-card trace-card--tool" data-testid="toolcalls-trace-card">
                    <div className="trace-card__header">
                      <div className="trace-card__meta">
                        <StatusPill tone={getToolCallStatusTone(toolCall.status)}>{toolCall.status}</StatusPill>
                        <StatusPill tone="neutral">{formatDurationMs(toolCall.durationMs)}</StatusPill>
                      </div>
                      <span className="trace-card__time">{formatDateTime(toolCall.createdAt)}</span>
                    </div>

                    <div className="tool-trace-card__headline">
                      <div className="tool-trace-card__icon">
                        <Wrench weight="duotone" />
                      </div>
                      <div>
                        <strong>{toolCall.toolName}</strong>
                        <span>{toolCall.conversationTurnId}</span>
                      </div>
                    </div>

                    <div className="tool-trace-card__payloads">
                      <div>
                        <span>Entrada</span>
                        <pre>{previewJson(toolCall.inputPayload)}</pre>
                      </div>
                      <div>
                        <span>Saida</span>
                        <pre>{previewJson(toolCall.outputPayload)}</pre>
                      </div>
                    </div>

                    <div className="tool-trace-card__actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void onSetStatus(toolCall, "success")}
                        disabled={toolCall.status === "success"}
                      >
                        <CheckCircle weight="duotone" />
                        Success
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void onSetStatus(toolCall, "error")}
                        disabled={toolCall.status === "error"}
                      >
                        <WarningCircle weight="duotone" />
                        Error
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <PaginationControls meta={meta} onPageChange={setPage} />
            </>
          ) : null}
        </section>

        <section className="signal-panel signal-panel--secondary" data-testid="toolcalls-manual-panel">
          <div className="signal-panel__header">
            <div>
              <h3>Registrar manualmente</h3>
              <p>Use esta area para criar uma execucao de teste quando precisar validar estados.</p>
            </div>
          </div>

          <Input
            label="Conversation Turn ID"
            value={form.conversationTurnId}
            onChange={(event) => setForm((current) => ({ ...current, conversationTurnId: event.target.value }))}
            placeholder="UUID"
          />
          <Input
            label="Tool Name"
            value={form.toolName}
            onChange={(event) => setForm((current) => ({ ...current, toolName: event.target.value }))}
            placeholder="llm.generate"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ToolCallStatus }))}
          >
            <option value="running">running</option>
            <option value="success">success</option>
            <option value="error">error</option>
          </Select>
          <TextArea
            label="Input payload"
            value={form.inputPayload}
            onChange={(event) => setForm((current) => ({ ...current, inputPayload: event.target.value }))}
            hint="JSON valido."
          />

          <div className="form-actions">
            <Button variant="primary" onClick={() => void onCreateToolCall()} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>

          <div className="signal-message signal-message--neutral">
            <Code weight="duotone" />
            <div>
              <strong>O que aparece aqui</strong>
              <span>Uma trilha curta das acoes internas do sistema e dos processamentos executados.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
