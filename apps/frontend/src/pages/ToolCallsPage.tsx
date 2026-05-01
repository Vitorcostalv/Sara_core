import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  Code,
  PlayCircle,
  Pulse,
  WarningCircle,
  Wrench
} from "@phosphor-icons/react";
import type { JsonValue, PaginationMeta, ToolCallStatus, ToolCall } from "@sara/shared-types";
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

function previewJson(value: JsonValue | null | undefined) {
  if (value === null || value === undefined) {
    return "null";
  }

  return JSON.stringify(value, null, 2);
}

export function ToolCallsPage() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ToolCallFilters>({ status: "", conversationTurnId: "" });
  const [form, setForm] = useState<ToolCallForm>(initialForm);

  const loadToolCalls = useCallback(
    async (page = meta.page) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await toolCallsApi.list({
          page,
          pageSize: meta.pageSize,
          status: filters.status || undefined,
          conversationTurnId: filters.conversationTurnId.trim() || undefined
        });

        setToolCalls(response.data);
        setMeta(response.meta);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [filters.conversationTurnId, filters.status, meta.page, meta.pageSize]
  );

  useEffect(() => {
    void loadToolCalls(1);
  }, [loadToolCalls]);

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

      setForm(initialForm);
      setSuccessMessage("Tool call sintetico registrado.");
      await loadToolCalls(1);
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

      setSuccessMessage(`Tool call atualizado para ${status}.`);
      await loadToolCalls(meta.page);
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
        eyebrow="Observability rail"
        title="Tool Trace"
        description="A trilha de ferramentas deixa de ser tabela crua e passa a operar como painel de observabilidade compacto: status, payload e atualizacao rapida em um fluxo legivel."
        icon={<PlayCircle weight="duotone" />}
        actions={<StatusPill tone="info">GET / POST / PATCH tool-calls</StatusPill>}
      />

      <section className="tool-hero">
        <div className="tool-hero__stats">
          <div className="signal-metric">
            <span>Total visivel</span>
            <strong>{toolCalls.length}</strong>
            <small>{meta.total} no backend paginado</small>
          </div>
          <div className="signal-metric">
            <span>Success</span>
            <strong>{successCount}</strong>
            <small>traces concluidos</small>
          </div>
          <div className="signal-metric">
            <span>Error</span>
            <strong>{errorCount}</strong>
            <small>traces com falha</small>
          </div>
          <div className="signal-metric">
            <span>Running</span>
            <strong>{runningCount}</strong>
            <small>aguardando desfecho</small>
          </div>
        </div>
      </section>

      <div className="tool-layout">
        <section className="signal-panel">
          <div className="signal-panel__header">
            <div>
              <span className="signal-panel__eyebrow">Trace filter</span>
              <h3>Execution stream</h3>
              <p>Observe chamadas reais e refine a lista sem poluir a tela principal.</p>
            </div>
          </div>

          <FilterBar
            actions={
              <>
                <Button variant="secondary" onClick={() => void loadToolCalls(meta.page)} disabled={isLoading}>
                  Atualizar
                </Button>
                <Button variant="ghost" onClick={() => setFilters({ status: "", conversationTurnId: "" })}>
                  Resetar
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

          {errorMessage ? <ErrorState title="Nao foi possivel carregar tool calls" message={errorMessage} onRetry={() => void loadToolCalls(meta.page)} /> : null}
          {successMessage ? (
            <div className="signal-message signal-message--success">
              <CheckCircle weight="duotone" />
              <div>
                <strong>Atualizacao concluida</strong>
                <span>{successMessage}</span>
              </div>
            </div>
          ) : null}
          {isLoading ? <LoadingBlock label="Carregando traces..." /> : null}
          {!isLoading && !errorMessage && toolCalls.length === 0 ? (
            <EmptyState
              icon={<Pulse weight="duotone" />}
              title="Nenhum trace encontrado"
              description="Gere chamadas reais via voz ou registre um tool call sintetico para iniciar a observabilidade."
            />
          ) : null}
          {!isLoading && !errorMessage && toolCalls.length > 0 ? (
            <>
              <div className="tool-trace-list">
                {toolCalls.map((toolCall) => (
                  <article key={toolCall.id} className="trace-card trace-card--tool">
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
                        <span>Input</span>
                        <pre>{previewJson(toolCall.inputPayload)}</pre>
                      </div>
                      <div>
                        <span>Output</span>
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
              <PaginationControls meta={meta} onPageChange={(page) => void loadToolCalls(page)} />
            </>
          ) : null}
        </section>

        <section className="signal-panel signal-panel--secondary">
          <div className="signal-panel__header">
            <div>
              <span className="signal-panel__eyebrow">Synthetic event</span>
              <h3>Registrar manualmente</h3>
              <p>Util para smoke tests e validacao de payload sem depender do fluxo completo.</p>
            </div>
          </div>

          <div className="summary-list">
            <div>
              <strong>Contract</strong>
              <span>Sem mudancas de payload nesta etapa.</span>
            </div>
            <div>
              <strong>Use case</strong>
              <span>Debug pontual e ensaio de estados na interface.</span>
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
              {isSubmitting ? "Salvando..." : "Registrar tool call"}
            </Button>
          </div>

          <div className="signal-message signal-message--neutral">
            <Code weight="duotone" />
            <div>
              <strong>Observabilidade compacta</strong>
              <span>Esta lateral existe para suporte tecnico, sem roubar foco da trilha principal de traces.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
