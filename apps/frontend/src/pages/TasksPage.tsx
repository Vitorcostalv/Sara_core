import { CheckCircle, ListChecks } from "@phosphor-icons/react";
import { Button, Card, EmptyState, PageHeader, Section } from "../components/ui";

export function TasksPage() {
  return (
    <div className="page-stack">
      <PageHeader
        title="Tasks"
        description="Track daily tasks, priorities and execution status with a clean operational view."
        icon={<ListChecks weight="duotone" />}
        actions={
          <Button variant="primary" disabled>
            New Task
          </Button>
        }
      />

      <Section
        title="Task Pipeline"
        subtitle="Task CRUD and filters will be connected in the next implementation step."
      >
        <Card>
          <EmptyState
            icon={<CheckCircle weight="duotone" />}
            title="No tasks yet"
            description="Create your first task to start organizing Sara daily flows."
            actionLabel="Create first task"
          />
        </Card>
      </Section>
    </div>
  );
}
