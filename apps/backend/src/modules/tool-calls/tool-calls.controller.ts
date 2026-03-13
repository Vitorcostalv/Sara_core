import type { Request, Response } from "express";
import { sendCreated, sendOk, sendPaginated } from "../../core/http/response";
import { toolCallsService } from "./tool-calls.service";
import type {
  CreateToolCallInput,
  ListToolCallsQuery,
  ToolCallIdParam,
  UpdateToolCallStatusInput
} from "./tool-calls.schemas";

export class ToolCallsController {
  list(req: Request, res: Response): void {
    const query = req.query as unknown as ListToolCallsQuery;
    const result = toolCallsService.listToolCalls(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  create(req: Request, res: Response): void {
    const payload = req.body as CreateToolCallInput;
    const toolCall = toolCallsService.createToolCall(payload);
    sendCreated(res, toolCall);
  }

  getById(req: Request, res: Response): void {
    const params = req.params as ToolCallIdParam;
    const toolCall = toolCallsService.getToolCallById(params.id);
    sendOk(res, toolCall);
  }

  updateStatus(req: Request, res: Response): void {
    const params = req.params as ToolCallIdParam;
    const payload = req.body as UpdateToolCallStatusInput;
    const toolCall = toolCallsService.updateToolCallStatus(params.id, payload);
    sendOk(res, toolCall);
  }
}

export const toolCallsController = new ToolCallsController();
