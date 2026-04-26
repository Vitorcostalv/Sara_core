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
    ...overrides,
  };
}

test("TasksService.getTaskById throws when task does not exist", async () => {
  const repository: TasksRepositoryContract = {
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve(makeTask()),
    findById: () => Promise.resolve(null),
    updateById: () => Promise.resolve(null),
    completeById: () => Promise.resolve(null),
    deleteById: () => Promise.resolve(false),
  };

  const service = new TasksService(repository);

  await assert.rejects(
    () => service.getTaskById("missing-id"),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "TASK_NOT_FOUND");
      return true;
    }
  );
});

test("TasksService.completeTask rejects archived tasks", async () => {
  const archivedTask = makeTask({ status: "archived" });

  const repository: TasksRepositoryContract = {
    list: () => Promise.resolve({ items: [], total: 0 }),
    create: () => Promise.resolve(archivedTask),
    findById: () => Promise.resolve(archivedTask),
    updateById: () => Promise.resolve(archivedTask),
    completeById: () => Promise.resolve(null),
    deleteById: () => Promise.resolve(false),
  };

  const service = new TasksService(repository);

  await assert.rejects(
    () => service.completeTask(archivedTask.id),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "TASK_ARCHIVED");
      return true;
    }
  );
});
