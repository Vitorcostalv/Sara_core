import type { Request, Response } from "express";
import { tasksService } from "./tasks.service";
import { listTasksQuerySchema } from "./tasks.schemas";

export class TasksController {
  list(req: Request, res: Response): void {
    const query = listTasksQuerySchema.parse(req.query);
    const tasks = tasksService.listTasks(query);
    res.status(200).json({ data: tasks, meta: { total: tasks.length } });
  }

  create(req: Request, res: Response): void {
    const task = tasksService.createTask(req.body);
    res.status(201).json({ data: task });
  }
}

export const tasksController = new TasksController();
