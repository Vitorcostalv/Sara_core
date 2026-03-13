import type { TaskPriority, TaskStatus, ToolCallStatus } from "@sara/shared-types";

type Tone = "neutral" | "success" | "warning" | "error" | "info";

export function getTaskStatusTone(status: TaskStatus): Tone {
  switch (status) {
    case "done":
      return "success";
    case "in_progress":
      return "info";
    case "archived":
      return "neutral";
    case "pending":
    default:
      return "warning";
  }
}

export function getTaskPriorityTone(priority: TaskPriority): Tone {
  if (priority >= 5) {
    return "error";
  }

  if (priority >= 4) {
    return "warning";
  }

  if (priority <= 2) {
    return "info";
  }

  return "neutral";
}

export function getToolCallStatusTone(status: ToolCallStatus): Tone {
  switch (status) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "running":
    default:
      return "info";
  }
}
