import type { Request, Response } from "express";
import { sendCreated, sendOk, sendPaginated } from "../../core/http/response";
import { conversationTurnsService } from "./conversation-turns.service";
import type {
  ConversationTurnIdParam,
  CreateConversationTurnInput,
  ListConversationTurnsQuery,
} from "./conversation-turns.schemas";

export class ConversationTurnsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListConversationTurnsQuery;
    const result = await conversationTurnsService.listConversationTurns(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateConversationTurnInput;
    const turn = await conversationTurnsService.createConversationTurn(payload);
    sendCreated(res, turn);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as ConversationTurnIdParam;
    const turn = await conversationTurnsService.getConversationTurnById(params.id);
    sendOk(res, turn);
  }
}

export const conversationTurnsController = new ConversationTurnsController();
