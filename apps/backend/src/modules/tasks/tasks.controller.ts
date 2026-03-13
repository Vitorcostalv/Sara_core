import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk, sendPaginated } from "../../core/http/response";
import { tasksService } from "./tasks.service";
import type { CreateTaskInput, ListTasksQuery, TaskIdParam, UpdateTaskInput } from "./tasks.schemas";

export class TasksController {
  list(req: Request, res: Response): void {
    const query = req.query as unknown as ListTasksQuery;
    const result = tasksService.listTasks(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  create(req: Request, res: Response): void {
    const payload = req.body as CreateTaskInput;
    const task = tasksService.createTask(payload);
    sendCreated(res, task);
  }

  getById(req: Request, res: Response): void {
    const params = req.params as TaskIdParam;
    const task = tasksService.getTaskById(params.id);
    sendOk(res, task);
  }

  update(req: Request, res: Response): void {
    const params = req.params as TaskIdParam;
    const payload = req.body as UpdateTaskInput;
    const task = tasksService.updateTask(params.id, payload);
    sendOk(res, task);
  }

  complete(req: Request, res: Response): void {
    const params = req.params as TaskIdParam;
    const task = tasksService.completeTask(params.id);
    sendOk(res, task);
  }

  remove(req: Request, res: Response): void {
    const params = req.params as TaskIdParam;
    tasksService.deleteTask(params.id);
    sendNoContent(res);
  }
}

export const tasksController = new TasksController();
