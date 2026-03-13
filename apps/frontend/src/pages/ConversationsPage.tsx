import { useCallback, useEffect, useState } from "react";
import { ChatCircleDots, ClockCounterClockwise } from "@phosphor-icons/react";
import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
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
import { conversationTurnsApi, getApiErrorMessage } from "../services/api/client";
import { formatDateTime } from "../utils/format";

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

interface ConversationFilters {
  role: "" | ConversationRole;
  source: string;
}

interface ConversationForm {
  role: ConversationRole;
  source: string;
  content: string;
}

const initialForm: ConversationForm = {
  role: "user",
  source: "chat",
  content: ""
};

export function ConversationsPage() {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({ role: "", source: "" });
  const [form, setForm] = useState<ConversationForm>(initialForm);

  const loadTurns = useCallback(
    async (page = meta.page) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await conversationTurnsApi.list({
          page,
          pageSize: meta.pageSize,
          role: filters.role || undefined,
          source: filters.source.trim() || undefined
        });

        setTurns(response.data);
        setMeta(response.meta);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [filters.role, filters.source, meta.page, meta.pageSize]
  );

  useEffect(() => {
    void loadTurns(1);
  }, [loadTurns]);

  const onCreateTurn = async () => {
    if (!form.content.trim()) {
      setErrorMessage("Conversation content is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await conversationTurnsApi.create({
        role: form.role,
        source: form.source.trim() || "chat",
        content: form.content.trim()
      });

      setForm(initialForm);
      setSuccessMessage("Conversation turn added.");
      await loadTurns(1);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: "content",
      header: "Content",
      render: (turn: ConversationTurn) => (
        <div>
          <strong>{turn.content.slice(0, 90)}</strong>
          <div className="ui-input-field__hint">{formatDateTime(turn.createdAt)}</div>
        </div>
      )
    },
    {
      key: "role",
      header: "Role",
      render: (turn: ConversationTurn) => <Badge tone="info">{turn.role}</Badge>
    },
    {
      key: "source",
      header: "Source",
      render: (turn: ConversationTurn) => <Badge tone="neutral">{turn.source}</Badge>
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Conversations"
        description="Timeline of user and assistant turns with filters by role and source."
        icon={<ClockCounterClockwise weight="duotone" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Register Conversation Turn</CardTitle>
        </CardHeader>
        <CardContent className="stack-sm">
          <div className="form-grid">
            <Select
              label="Role"
              value={form.role}
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value as ConversationRole }))
              }
            >
              <option value="user">user</option>
              <option value="assistant">assistant</option>
              <option value="system">system</option>
            </Select>
            <Input
              label="Source"
              value={form.source}
              onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
              placeholder="chat"
            />
          </div>
          <TextArea
            label="Content"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            placeholder="Conversation turn content"
          />
          <div className="form-actions">
            <Button variant="primary" onClick={() => void onCreateTurn()} disabled={isSubmitting}>
              <ChatCircleDots weight="duotone" />
              {isSubmitting ? "Saving..." : "Add Turn"}
            </Button>
            {successMessage ? <span className="form-feedback">{successMessage}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Section title="Conversation Timeline" subtitle="Paginated list ordered by backend createdAt DESC.">
        <FilterBar
          actions={
            <Button variant="ghost" onClick={() => setFilters({ role: "", source: "" })}>
              Reset filters
            </Button>
          }
        >
          <Select
            label="Role"
            value={filters.role}
            onChange={(event) =>
              setFilters((current) => ({ ...current, role: event.target.value as ConversationFilters["role"] }))
            }
          >
            <option value="">All</option>
            <option value="user">user</option>
            <option value="assistant">assistant</option>
            <option value="system">system</option>
          </Select>
          <Input
            label="Source"
            value={filters.source}
            onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}
            placeholder="chat"
          />
        </FilterBar>

        {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadTurns(meta.page)} /> : null}
        {isLoading ? <LoadingBlock label="Loading conversations..." /> : null}
        {!isLoading && !errorMessage && turns.length === 0 ? (
          <EmptyState title="No turns found" description="Register turns or adjust current filters." />
        ) : null}
        {!isLoading && !errorMessage && turns.length > 0 ? (
          <>
            <DataTable columns={columns} data={turns} rowKey={(turn) => turn.id} />
            <PaginationControls meta={meta} onPageChange={(page) => void loadTurns(page)} />
          </>
        ) : null}
      </Section>
    </div>
  );
}
