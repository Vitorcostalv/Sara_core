import { ChatCircleText, FunnelSimple, Sparkle } from "@phosphor-icons/react";
import type { ConversationRole, ConversationTurn, PaginationMeta } from "@sara/shared-types";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  Input,
  LoadingBlock,
  PaginationControls,
  Section,
  Select,
  StatusPill
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

function getRoleTone(role: ConversationRole) {
  switch (role) {
    case "assistant":
      return "success";
    case "system":
      return "warning";
    case "user":
    default:
      return "info";
  }
}

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
      title="Conversation trace"
      subtitle="Historico recente para validar a persistencia observavel do fluxo de voz sem afogar a interface principal."
      actions={
        <StatusPill tone="neutral">
          {meta.total} eventos
        </StatusPill>
      }
    >
      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={() => onLoadTurns(meta.page)} disabled={isLoading}>
              Atualizar
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
          <option value="">Todos</option>
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

      {listError ? <ErrorState title="Nao foi possivel carregar a timeline" message={listError} onRetry={() => onLoadTurns(meta.page)} /> : null}
      {isLoading ? <LoadingBlock label="Carregando eventos persistidos..." /> : null}
      {!isLoading && !listError && turns.length === 0 ? (
        <EmptyState
          icon={<FunnelSimple weight="duotone" />}
          title="Nenhum turno encontrado"
          description="Execute uma tentativa ou ajuste os filtros para trazer eventos persistidos."
        />
      ) : null}
      {!isLoading && !listError && turns.length > 0 ? (
        <>
          <div className="timeline-grid">
            {turns.map((turn) => (
              <article key={turn.id} className="trace-card">
                <div className="trace-card__header">
                  <div className="trace-card__meta">
                    <StatusPill tone={getRoleTone(turn.role)}>{turn.role}</StatusPill>
                    <StatusPill tone="neutral">{turn.source}</StatusPill>
                  </div>
                  <span className="trace-card__time">{formatDateTime(turn.createdAt)}</span>
                </div>

                <div className="trace-card__body">
                  <div className="trace-card__icon">
                    {turn.role === "assistant" ? <Sparkle weight="duotone" /> : <ChatCircleText weight="duotone" />}
                  </div>
                  <p>{turn.content}</p>
                </div>

                <footer className="trace-card__footer">
                  <span>{turn.id}</span>
                </footer>
              </article>
            ))}
          </div>
          <PaginationControls meta={meta} onPageChange={onLoadTurns} />
        </>
      ) : null}
    </Section>
  );
}
