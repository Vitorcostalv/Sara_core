import { ClockCounterClockwise, Waveform } from "@phosphor-icons/react";
import { Card, EmptyState, PageHeader, Section } from "../components/ui";

export function ConversationsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Conversations"
        description="Timeline and audit trail for conversation turns and future tool usage traces."
        icon={<ClockCounterClockwise weight="duotone" />}
      />

      <Section
        title="Conversation Timeline"
        subtitle="Chronological visualization of turns, metadata and local execution events."
      >
        <Card>
          <EmptyState
            icon={<Waveform weight="duotone" />}
            title="No conversations stored"
            description="New interactions will appear here as soon as local conversation logging is integrated."
          />
        </Card>
      </Section>
    </div>
  );
}
