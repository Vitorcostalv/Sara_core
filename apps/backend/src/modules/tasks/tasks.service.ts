import type { Task } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { TasksRepository } from "./tasks.repository";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.schemas";

const tasksLogger = logger.child({ module: "tasks-service" });

export interface TasksRepositoryContract {
  list(query: ListTasksQuery): PaginatedResult<Task>;
  create(input: CreateTaskInput): Task;
  findById(id: string): Task | null;
  updateById(id: string, input: UpdateTaskInput): Task | null;
  completeById(id: string): Task | null;
  deleteById(id: string): boolean;
}

export class TasksService {
  constructor(private readonly repository: TasksRepositoryContract) {}

  listTasks(query: ListTasksQuery): PaginatedResult<Task> {
    tasksLogger.debug({ query }, "Listing tasks");
    return this.repository.list(query);
  }

  createTask(input: CreateTaskInput): Task {
    tasksLogger.debug({ userId: input.userId, title: input.title }, "Creating task");
    return this.repository.create(input);
  }

  getTaskById(id: string): Task {
    const task = this.repository.findById(id);

    if (!task) {
      throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    }

    return task;
  }

  updateTask(id: string, input: UpdateTaskInput): Task {
    const task = this.repository.updateById(id, input);

    if (!task) {
      throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    }

    return task;
  }

  completeTask(id: string): Task {
    const currentTask = this.repository.findById(id);

    if (!currentTask) {
      throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    }

    if (currentTask.status === "archived") {
      throw new AppError("TASK_ARCHIVED", 409, "Archived tasks cannot be marked as done");
    }

    const completedTask = this.repository.completeById(id);

    if (!completedTask) {
      throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    }

    return completedTask;
  }

  deleteTask(id: string): void {
    const deleted = this.repository.deleteById(id);

    if (!deleted) {
      throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    }
  }
}

export const tasksService = new TasksService(new TasksRepository());
