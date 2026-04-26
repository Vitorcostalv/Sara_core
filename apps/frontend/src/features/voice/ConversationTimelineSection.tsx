import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PaginationControls,
  Section,
  Select
} from "../../components/ui";
import { formatDateTime } from "../../utils/format";

interface ConversationTimelineSectionProps {
  filters: {
    role: "" | ConversationRole;
    source: string;
  };
  isLoading: boolean;
  listError: string | null;
  meta: PaginationMeta;
  turns: ConversationTurn[];
  onClearFilters: () => void;
  onLoadTurns: (page: number) => void;
  onRoleChange: (role: "" | ConversationRole) => void;
  onSourceChange: (source: string) => void;
}

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
] as const;

export function ConversationTimelineSection({
  filters,
  isLoading,
  listError,
  meta,
  turns,
  onClearFilters,
  onLoadTurns,
  onRoleChange,
  onSourceChange
}: ConversationTimelineSectionProps) {
  return (
    <Section
      title="Conversation Timeline"
      subtitle="Historico util para debug. O fluxo de voz desta etapa prioriza resultado imediato; persistencia automatica de turns pode ser reforcada na fase seguinte."
    >
      <FilterBar
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => onLoadTurns(meta.page)}
              disabled={isLoading}
            >
              Atualizar lista
            </Button>
            <Button variant="ghost" onClick={onClearFilters} disabled={isLoading}>
              Limpar filtros
            </Button>
          </>
        }
      >
        <Select
          label="Role"
          value={filters.role}
          onChange={(event) => onRoleChange(event.target.value as "" | ConversationRole)}
        >
          <option value="">All</option>
          <option value="user">user</option>
          <option value="assistant">assistant</option>
          <option value="system">system</option>
        </Select>
        <Input
          label="Source"
          value={filters.source}
          onChange={(event) => onSourceChange(event.target.value)}
          placeholder="voice"
        />
      </FilterBar>

      {listError ? (
        <ErrorState message={listError} onRetry={() => onLoadTurns(meta.page)} />
      ) : null}
      {isLoading ? <LoadingBlock label="Loading conversations..." /> : null}
      {!isLoading && !listError && turns.length === 0 ? (
        <EmptyState
          title="No turns found"
          description="Nenhum turn encontrado com os filtros atuais."
        />
      ) : null}
      {!isLoading && !listError && turns.length > 0 ? (
        <>
          <DataTable columns={[...columns]} data={turns} rowKey={(turn) => turn.id} />
          <PaginationControls meta={meta} onPageChange={onLoadTurns} />
        </>
      ) : null}
    </Section>
  );
}
