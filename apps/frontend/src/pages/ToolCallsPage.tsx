import { useCallback, useEffect, useState } from "react";
import { CheckCircle, PlayCircle, WarningCircle } from "@phosphor-icons/react";
import type { JsonValue, PaginationMeta, ToolCallStatus, ToolCall } from "@sara/shared-types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PageHeader,
  PaginationControls,
  Section,
  Select,
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
      setErrorMessage("conversationTurnId and toolName are required.");
      return;
    }

    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(form.inputPayload);
    } catch {
      setErrorMessage("Input payload must be valid JSON.");
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
      setSuccessMessage("Tool call registered.");
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

      setSuccessMessage(`Tool call updated to ${status}.`);
      await loadToolCalls(meta.page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const columns = [
    {
      key: "tool",
      header: "Tool",
      render: (toolCall: ToolCall) => (
        <div>
          <strong>{toolCall.toolName}</strong>
          <div className="ui-input-field__hint">{toolCall.conversationTurnId}</div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (toolCall: ToolCall) => (
        <Badge tone={getToolCallStatusTone(toolCall.status)}>{toolCall.status}</Badge>
      )
    },
    {
      key: "duration",
      header: "Duration",
      render: (toolCall: ToolCall) => <span>{formatDurationMs(toolCall.durationMs)}</span>
    },
    {
      key: "created",
      header: "Created",
      render: (toolCall: ToolCall) => <span>{formatDateTime(toolCall.createdAt)}</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (toolCall: ToolCall) => (
        <div className="inline-actions">
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
      )
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Tool Calls"
        description="Observe and control execution traces tied to conversation turns."
        icon={<PlayCircle weight="duotone" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Register Tool Call</CardTitle>
        </CardHeader>
        <CardContent className="stack-sm">
          <div className="form-grid">
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
              placeholder="task_resolver"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as ToolCallStatus }))
              }
            >
              <option value="running">running</option>
              <option value="success">success</option>
              <option value="error">error</option>
            </Select>
          </div>

          <TextArea
            label="Input Payload (JSON)"
            value={form.inputPayload}
            onChange={(event) => setForm((current) => ({ ...current, inputPayload: event.target.value }))}
          />

          <div className="form-actions">
            <Button variant="primary" onClick={() => void onCreateToolCall()} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Create Tool Call"}
            </Button>
            {successMessage ? <span className="form-feedback">{successMessage}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Section title="Execution Trace" subtitle="Filter by status and conversation turn id.">
        <FilterBar
          actions={
            <Button variant="ghost" onClick={() => setFilters({ status: "", conversationTurnId: "" })}>
              Reset filters
            </Button>
          }
        >
          <Select
            label="Status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value as ToolCallFilters["status"] }))
            }
          >
            <option value="">All</option>
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

        {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadToolCalls(meta.page)} /> : null}
        {isLoading ? <LoadingBlock label="Loading tool calls..." /> : null}
        {!isLoading && !errorMessage && toolCalls.length === 0 ? (
          <EmptyState title="No tool calls found" description="Register tool calls or adjust current filters." />
        ) : null}
        {!isLoading && !errorMessage && toolCalls.length > 0 ? (
          <>
            <DataTable columns={columns} data={toolCalls} rowKey={(toolCall) => toolCall.id} />
            <PaginationControls meta={meta} onPageChange={(page) => void loadToolCalls(page)} />
          </>
        ) : null}
      </Section>
    </div>
  );
}
