import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { conversationTurnsController } from "./conversation-turns.controller";
import {
  conversationTurnIdParamSchema,
  createConversationTurnSchema,
  listConversationTurnsQuerySchema,
} from "./conversation-turns.schemas";

export const conversationTurnsRoutes = Router();

conversationTurnsRoutes.get(
  "/",
  validateQuery(listConversationTurnsQuerySchema),
  asyncHandler(conversationTurnsController.list.bind(conversationTurnsController))
);
conversationTurnsRoutes.post(
  "/",
  validateBody(createConversationTurnSchema),
  asyncHandler(conversationTurnsController.create.bind(conversationTurnsController))
);
conversationTurnsRoutes.get(
  "/:id",
  validateParams(conversationTurnIdParamSchema),
  asyncHandler(conversationTurnsController.getById.bind(conversationTurnsController))
);
