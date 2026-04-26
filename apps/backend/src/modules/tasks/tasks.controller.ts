import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk, sendPaginated } from "../../core/http/response";
import { tasksService } from "./tasks.service";
import type { CreateTaskInput, ListTasksQuery, TaskIdParam, UpdateTaskInput } from "./tasks.schemas";

export class TasksController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListTasksQuery;
    const result = await tasksService.listTasks(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateTaskInput;
    const task = await tasksService.createTask(payload);
    sendCreated(res, task);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as TaskIdParam;
    const task = await tasksService.getTaskById(params.id);
    sendOk(res, task);
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as TaskIdParam;
    const payload = req.body as UpdateTaskInput;
    const task = await tasksService.updateTask(params.id, payload);
    sendOk(res, task);
  }

  async complete(req: Request, res: Response): Promise<void> {
    const params = req.params as TaskIdParam;
    const task = await tasksService.completeTask(params.id);
    sendOk(res, task);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as TaskIdParam;
    await tasksService.deleteTask(params.id);
    sendNoContent(res);
  }
}

export const tasksController = new TasksController();
