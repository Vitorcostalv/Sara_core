import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Plus, Trash } from "@phosphor-icons/react";
import type { PaginationMeta, Task, TaskPriority, TaskStatus } from "@sara/shared-types";
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
  StatusPill,
  TextArea
} from "../components/ui";
import { getApiErrorMessage, tasksApi } from "../services/api/client";
import { formatDateTime } from "../utils/format";
import { getTaskPriorityTone, getTaskStatusTone } from "../utils/status";

const initialMeta: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

interface TaskFilters {
  status: "" | TaskStatus;
  priority: "" | TaskPriority;
}

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
}

const initialForm: TaskForm = {
  title: "",
  description: "",
  priority: 3,
  dueDate: ""
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta);
  const [filters, setFilters] = useState<TaskFilters>({ status: "", priority: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(initialForm);

  const loadTasks = useCallback(
    async (page = meta.page) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await tasksApi.list({
          page,
          pageSize: meta.pageSize,
          status: filters.status || undefined,
          priority: filters.priority || undefined
        });

        setTasks(response.data);
        setMeta(response.meta);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [filters.priority, filters.status, meta.page, meta.pageSize]
  );

  useEffect(() => {
    void loadTasks(1);
  }, [loadTasks]);

  const onCreateTask = async () => {
    if (!form.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await tasksApi.create({
        title: form.title.trim(),
        description: form.description.trim() ? form.description.trim() : null,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null
      });

      setForm(initialForm);
      setSuccessMessage("Task created successfully.");
      await loadTasks(1);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCompleteTask = async (id: string) => {
    setSuccessMessage(null);

    try {
      await tasksApi.complete(id);
      setSuccessMessage("Task marked as done.");
      await loadTasks(meta.page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const onDeleteTask = async (id: string) => {
    setSuccessMessage(null);

    try {
      await tasksApi.remove(id);
      setSuccessMessage("Task removed.");
      await loadTasks(meta.page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const columns = [
    {
      key: "title",
      header: "Task",
      render: (task: Task) => (
        <div>
          <strong>{task.title}</strong>
          <div className="ui-input-field__hint">{task.description || "No description"}</div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (task: Task) => <StatusPill tone={getTaskStatusTone(task.status)}>{task.status}</StatusPill>
    },
    {
      key: "priority",
      header: "Priority",
      render: (task: Task) => <Badge tone={getTaskPriorityTone(task.priority)}>P{task.priority}</Badge>
    },
    {
      key: "dueDate",
      header: "Due",
      render: (task: Task) => <span>{formatDateTime(task.dueDate)}</span>
    },
    {
      key: "actions",
      header: "Actions",
      render: (task: Task) => (
        <div className="inline-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onCompleteTask(task.id)}
            disabled={task.status === "done"}
          >
            <CheckCircle weight="duotone" />
            Complete
          </Button>
          <Button variant="danger" size="sm" onClick={() => void onDeleteTask(task.id)}>
            <Trash weight="duotone" />
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Tasks"
        description="Plan, prioritize and close daily tasks with full backend integration."
        icon={<CheckCircle weight="duotone" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
        </CardHeader>
        <CardContent className="stack-sm">
          <div className="form-grid">
            <Input
              label="Title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Task title"
            />
            <Select
              label="Priority"
              value={String(form.priority)}
              onChange={(event) =>
                setForm((current) => ({ ...current, priority: Number(event.target.value) as TaskPriority }))
              }
            >
              <option value="1">1 - Low</option>
              <option value="2">2</option>
              <option value="3">3 - Normal</option>
              <option value="4">4</option>
              <option value="5">5 - High</option>
            </Select>
            <Input
              label="Due date"
              type="datetime-local"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </div>
          <TextArea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Optional details"
          />
          <div className="form-actions">
            <Button variant="primary" onClick={() => void onCreateTask()} disabled={isSubmitting}>
              <Plus weight="duotone" />
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
            {successMessage ? <span className="form-feedback">{successMessage}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Section title="Task Pipeline" subtitle="Filter, paginate and manage task execution.">
        <FilterBar
          actions={
            <Button variant="ghost" onClick={() => setFilters({ status: "", priority: "" })}>
              Reset filters
            </Button>
          }
        >
          <Select
            label="Status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as TaskFilters["status"] }))}
          >
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
            <option value="archived">archived</option>
          </Select>

          <Select
            label="Priority"
            value={filters.priority ? String(filters.priority) : ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value ? (Number(event.target.value) as TaskPriority) : ""
              }))
            }
          >
            <option value="">All</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </Select>
        </FilterBar>

        {errorMessage ? <ErrorState message={errorMessage} onRetry={() => void loadTasks(meta.page)} /> : null}
        {isLoading ? <LoadingBlock label="Loading tasks..." /> : null}
        {!isLoading && !errorMessage && tasks.length === 0 ? (
          <EmptyState title="No tasks found" description="Adjust filters or create your first task." />
        ) : null}
        {!isLoading && !errorMessage && tasks.length > 0 ? (
          <>
            <DataTable columns={columns} data={tasks} rowKey={(task) => task.id} />
            <PaginationControls meta={meta} onPageChange={(page) => void loadTasks(page)} />
          </>
        ) : null}
      </Section>
    </div>
  );
}
