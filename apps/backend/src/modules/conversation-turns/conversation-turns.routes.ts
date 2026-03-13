import { Router } from "express";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { conversationTurnsController } from "./conversation-turns.controller";
import {
  conversationTurnIdParamSchema,
  createConversationTurnSchema,
  listConversationTurnsQuerySchema
} from "./conversation-turns.schemas";

export const conversationTurnsRoutes = Router();

conversationTurnsRoutes.get(
  "/",
  validateQuery(listConversationTurnsQuerySchema),
  conversationTurnsController.list.bind(conversationTurnsController)
);
conversationTurnsRoutes.post(
  "/",
  validateBody(createConversationTurnSchema),
  conversationTurnsController.create.bind(conversationTurnsController)
);
conversationTurnsRoutes.get(
  "/:id",
  validateParams(conversationTurnIdParamSchema),
  conversationTurnsController.getById.bind(conversationTurnsController)
);
