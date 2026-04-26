import type { Request, Response } from "express";
import { sendCreated, sendOk, sendPaginated } from "../../core/http/response";
import { toolCallsService } from "./tool-calls.service";
import type {
  CreateToolCallInput,
  ListToolCallsQuery,
  ToolCallIdParam,
  UpdateToolCallStatusInput,
} from "./tool-calls.schemas";

export class ToolCallsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListToolCallsQuery;
    const result = await toolCallsService.listToolCalls(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateToolCallInput;
    const toolCall = await toolCallsService.createToolCall(payload);
    sendCreated(res, toolCall);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as ToolCallIdParam;
    const toolCall = await toolCallsService.getToolCallById(params.id);
    sendOk(res, toolCall);
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const params = req.params as ToolCallIdParam;
    const payload = req.body as UpdateToolCallStatusInput;
    const toolCall = await toolCallsService.updateToolCallStatus(params.id, payload);
    sendOk(res, toolCall);
  }
}

export const toolCallsController = new ToolCallsController();
