import { useCallback, useEffect, useMemo, useState } from "react";
import { ClockCounterClockwise, Database, ListChecks, UserCircle, Wrench } from "@phosphor-icons/react";
import type { ConversationTurn, Fact, Task, ToolCall, UserProfile } from "@sara/shared-types";
import { StatCard } from "../components/StatCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Section,
  StatusPill
} from "../components/ui";
import { conversationTurnsApi, factsApi, getApiErrorMessage, tasksApi, toolCallsApi, userProfileApi } from "../services/api/client";
import { formatDateTime } from "../utils/format";
import { getTaskStatusTone, getToolCallStatusTone } from "../utils/status";

interface DashboardState {
  profile: UserProfile | null;
  tasks: Task[];
  tasksTotal: number;
  importantFacts: Fact[];
  factsTotal: number;
  recentTurns: ConversationTurn[];
  turnsTotal: number;
  recentToolCalls: ToolCall[];
  toolCallsTotal: number;
}

const initialDashboardState: DashboardState = {
  profile: null,
  tasks: [],
  tasksTotal: 0,
  importantFacts: [],
  factsTotal: 0,
  recentTurns: [],
  turnsTotal: 0,
  recentToolCalls: [],
  toolCallsTotal: 0
};

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>(initialDashboardState);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [profileResponse, tasksResponse, factsResponse, turnsResponse, toolCallsResponse] =
        await Promise.all([
          userProfileApi.get(),
          tasksApi.list({ page: 1, pageSize: 5 }),
          factsApi.list({ page: 1, pageSize: 5, isImportant: true }),
          conversationTurnsApi.list({ page: 1, pageSize: 5 }),
          toolCallsApi.list({ page: 1, pageSize: 5 })
        ]);

      setState({
        profile: profileResponse.data,
        tasks: tasksResponse.data,
        tasksTotal: tasksResponse.meta.total,
        importantFacts: factsResponse.data,
        factsTotal: factsResponse.meta.total,
        recentTurns: turnsResponse.data,
        turnsTotal: turnsResponse.meta.total,
        recentToolCalls: toolCallsResponse.data,
        toolCallsTotal: toolCallsResponse.meta.total
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => [
      { label: "Profile", value: state.profile ? "1" : "0", hint: "active local profile", icon: <UserCircle weight="duotone" /> },
      { label: "Tasks", value: String(state.tasksTotal), hint: "tracked operational tasks", icon: <ListChecks weight="duotone" /> },
      { label: "Facts", value: String(state.factsTotal), hint: "memory facts in storage", icon: <Database weight="duotone" /> },
      { label: "Turns", value: String(state.turnsTotal), hint: "conversation timeline", icon: <ClockCounterClockwise weight="duotone" /> },
      { label: "Tool Calls", value: String(state.toolCallsTotal), hint: "execution traces", icon: <Wrench weight="duotone" /> }
    ],
    [state.factsTotal, state.profile, state.tasksTotal, state.toolCallsTotal, state.turnsTotal]
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        description="Operational snapshot of profile, memory, tasks and recent assistant activity."
        icon={<ClockCounterClockwise weight="duotone" />}
        actions={
          <StatusPill tone="info">
            {state.profile?.preferredName ?? state.profile?.displayName ?? "local-user"}
          </StatusPill>
        }
      />

      {isLoading ? <LoadingBlock label="Loading dashboard metrics..." /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadDashboard()} /> : null}

      {!isLoading && !errorMessage ? (
        <>
          <Section title="System Snapshot" subtitle="Live values loaded from backend contracts.">
            <div className="stats-grid">
              {stats.map((metric) => (
                <StatCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} icon={metric.icon} />
              ))}
            </div>
          </Section>

          <div className="page-columns">
            <Card>
              <CardHeader>
                <CardTitle>Task Preview</CardTitle>
                <CardDescription>Latest tasks sorted by backend update order.</CardDescription>
              </CardHeader>
              <CardContent>
                {state.tasks.length === 0 ? (
                  <EmptyState title="No tasks yet" description="Create tasks from the Tasks page to see progress here." />
                ) : (
                  <div className="stack-sm">
                    {state.tasks.map((task) => (
                      <div key={task.id} className="inline-row">
                        <div>
                          <strong>{task.title}</strong>
                          <div className="ui-input-field__hint">Updated {formatDateTime(task.updatedAt)}</div>
                        </div>
                        <StatusPill tone={getTaskStatusTone(task.status)}>{task.status}</StatusPill>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Important Facts</CardTitle>
                <CardDescription>Facts flagged as important for quick context retrieval.</CardDescription>
              </CardHeader>
              <CardContent>
                {state.importantFacts.length === 0 ? (
                  <EmptyState title="No important facts" description="Mark facts as important to highlight them in this panel." />
                ) : (
                  <div className="stack-sm">
                    {state.importantFacts.map((fact) => (
                      <div key={fact.id}>
                        <strong>{fact.key}</strong>
                        <div className="ui-input-field__hint">{fact.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Conversation and tool execution timeline overview.</CardDescription>
            </CardHeader>
            <CardContent className="page-columns">
              <div className="stack-sm">
                <strong>Conversation Turns</strong>
                {state.recentTurns.length === 0 ? (
                  <span className="ui-input-field__hint">No turns recorded yet.</span>
                ) : (
                  state.recentTurns.map((turn) => (
                    <div key={turn.id} className="inline-row">
                      <span className="ui-input-field__hint">{turn.content.slice(0, 48)}</span>
                      <StatusPill tone="info">{turn.role}</StatusPill>
                    </div>
                  ))
                )}
              </div>

              <div className="stack-sm">
                <strong>Tool Calls</strong>
                {state.recentToolCalls.length === 0 ? (
                  <span className="ui-input-field__hint">No tool calls recorded yet.</span>
                ) : (
                  state.recentToolCalls.map((toolCall) => (
                    <div key={toolCall.id} className="inline-row">
                      <span className="ui-input-field__hint">{toolCall.toolName}</span>
                      <StatusPill tone={getToolCallStatusTone(toolCall.status)}>{toolCall.status}</StatusPill>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
