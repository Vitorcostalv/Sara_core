import assert from "node:assert/strict";
import test from "node:test";
import type { Task } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import { TasksService, type TasksRepositoryContract } from "./tasks.service";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "6e74d286-468f-4aea-af66-f92bbf29f149",
    userId: "local-user",
    title: "Test task",
    description: null,
    status: "pending",
    priority: 3,
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

test("TasksService.getTaskById throws when task does not exist", () => {
  const repository: TasksRepositoryContract = {
    list: () => ({ items: [], total: 0 }),
    create: () => makeTask(),
    findById: () => null,
    updateById: () => null,
    completeById: () => null,
    deleteById: () => false
  };

  const service = new TasksService(repository);

  assert.throws(() => service.getTaskById("missing-id"), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "TASK_NOT_FOUND");
    return true;
  });
});

test("TasksService.completeTask rejects archived tasks", () => {
  const archivedTask = makeTask({ status: "archived" });

  const repository: TasksRepositoryContract = {
    list: () => ({ items: [], total: 0 }),
    create: () => archivedTask,
    findById: () => archivedTask,
    updateById: () => archivedTask,
    completeById: () => null,
    deleteById: () => false
  };

  const service = new TasksService(repository);

  assert.throws(() => service.completeTask(archivedTask.id), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "TASK_ARCHIVED");
    return true;
  });
});
