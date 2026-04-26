import type { Task } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { TasksRepository } from "./tasks.repository";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.schemas";

const tasksLogger = logger.child({ module: "tasks-service" });

export interface TasksRepositoryContract {
  list(query: ListTasksQuery): Promise<PaginatedResult<Task>>;
  create(input: CreateTaskInput): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  updateById(id: string, input: UpdateTaskInput): Promise<Task | null>;
  completeById(id: string): Promise<Task | null>;
  deleteById(id: string): Promise<boolean>;
}

export class TasksService {
  constructor(private readonly repository: TasksRepositoryContract) {}

  async listTasks(query: ListTasksQuery): Promise<PaginatedResult<Task>> {
    tasksLogger.debug({ query }, "Listing tasks");
    return this.repository.list(query);
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    tasksLogger.debug({ userId: input.userId, title: input.title }, "Creating task");
    return this.repository.create(input);
  }

  async getTaskById(id: string): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    return task;
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
    const task = await this.repository.updateById(id, input);
    if (!task) throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    return task;
  }

  async completeTask(id: string): Promise<Task> {
    const currentTask = await this.repository.findById(id);
    if (!currentTask) throw new AppError("TASK_NOT_FOUND", 404, "Task not found");

    if (currentTask.status === "archived") {
      throw new AppError("TASK_ARCHIVED", 409, "Archived tasks cannot be marked as done");
    }

    const completedTask = await this.repository.completeById(id);
    if (!completedTask) throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
    return completedTask;
  }

  async deleteTask(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new AppError("TASK_NOT_FOUND", 404, "Task not found");
  }
}

export const tasksService = new TasksService(new TasksRepository());
