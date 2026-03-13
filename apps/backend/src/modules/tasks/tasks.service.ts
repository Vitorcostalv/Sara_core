import type { Task } from "@sara/shared-types";
import { TasksRepository } from "./tasks.repository";
import type { CreateTaskInput, ListTasksQuery } from "./tasks.schemas";

export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  listTasks(query: ListTasksQuery): Task[] {
    return this.repository.list(query);
  }

  createTask(input: CreateTaskInput): Task {
    return this.repository.create(input);
  }
}

export const tasksService = new TasksService(new TasksRepository());
