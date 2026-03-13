import {
  CheckCircle,
  ClockCounterClockwise,
  Database,
  House,
  ListChecks,
  Warning,
  Waveform
} from "@phosphor-icons/react";
import { StatCard } from "../components/StatCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Section,
  StatusPill
} from "../components/ui";

const dashboardMetrics = [
  { label: "Profile", value: "1", hint: "local-user bootstrapped", icon: <House weight="duotone" /> },
  { label: "Facts", value: "0", hint: "semantic memory entries", icon: <Database weight="duotone" /> },
  { label: "Tasks", value: "0", hint: "pending planning items", icon: <ListChecks weight="duotone" /> },
  { label: "Turns", value: "0", hint: "conversation history", icon: <ClockCounterClockwise weight="duotone" /> }
];

export function DashboardPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        description="Vision panel for Sara local runtime. This stage focuses on UI foundation and architecture readiness."
        icon={<Waveform weight="duotone" />}
        badge="Foundation Phase"
      />

      <Section
        title="System Snapshot"
        subtitle="High-level counters for core entities already modeled in SQLite."
      >
        <div className="stats-grid">
          {dashboardMetrics.map((metric) => (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              icon={metric.icon}
            />
          ))}
        </div>
      </Section>

      <div className="page-columns">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Current system posture before feature integrations.</CardDescription>
          </CardHeader>
          <CardContent className="stack-sm">
            <div className="inline-status">
              <StatusPill tone="success">
                <CheckCircle weight="duotone" />
                API scaffold ready
              </StatusPill>
            </div>
            <div className="inline-status">
              <StatusPill tone="warning">
                <Warning weight="duotone" />
                Voice modules pending
              </StatusPill>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Integration Points</CardTitle>
            <CardDescription>Clear handoff targets for upcoming frontend and backend tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="clean-list">
              <li>Wire dashboard cards to live API responses.</li>
              <li>Add list and detail views for tasks and memories.</li>
              <li>Introduce local events timeline for tool calls.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
