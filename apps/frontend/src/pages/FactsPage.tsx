import { Database, Sparkle } from "@phosphor-icons/react";
import { Badge, Card, EmptyState, PageHeader, Section } from "../components/ui";

export function FactsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Facts"
        description="Persistent user memory space for facts, preferences and contextual signals."
        icon={<Database weight="duotone" />}
      />

      <Section
        title="Memory Segments"
        subtitle="Data categories will help future retrieval and local assistant reasoning."
        actions={<Badge tone="info">Schema ready</Badge>}
      >
        <Card>
          <EmptyState
            icon={<Sparkle weight="duotone" />}
            title="No memory facts recorded"
            description="This area will list factual entries and categories once the API module is connected."
          />
        </Card>
      </Section>
    </div>
  );
}
