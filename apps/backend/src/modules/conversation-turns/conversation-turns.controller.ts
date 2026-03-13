import type { Request, Response } from "express";
import { sendCreated, sendOk, sendPaginated } from "../../core/http/response";
import { conversationTurnsService } from "./conversation-turns.service";
import type {
  ConversationTurnIdParam,
  CreateConversationTurnInput,
  ListConversationTurnsQuery
} from "./conversation-turns.schemas";

export class ConversationTurnsController {
  list(req: Request, res: Response): void {
    const query = req.query as unknown as ListConversationTurnsQuery;
    const result = conversationTurnsService.listConversationTurns(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  create(req: Request, res: Response): void {
    const payload = req.body as CreateConversationTurnInput;
    const turn = conversationTurnsService.createConversationTurn(payload);
    sendCreated(res, turn);
  }

  getById(req: Request, res: Response): void {
    const params = req.params as ConversationTurnIdParam;
    const turn = conversationTurnsService.getConversationTurnById(params.id);
    sendOk(res, turn);
  }
}

export const conversationTurnsController = new ConversationTurnsController();
