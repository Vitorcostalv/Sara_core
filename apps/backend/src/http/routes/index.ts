import { Router } from "express";
import { conversationTurnsRoutes } from "../../modules/conversation-turns/conversation-turns.routes";
import { factsRoutes } from "../../modules/facts/facts.routes";
import { healthRoutes } from "../../modules/health/health.routes";
import { tasksRoutes } from "../../modules/tasks/tasks.routes";
import { toolCallsRoutes } from "../../modules/tool-calls/tool-calls.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/tasks", tasksRoutes);
apiRouter.use("/facts", factsRoutes);
apiRouter.use("/conversation-turns", conversationTurnsRoutes);
apiRouter.use("/tool-calls", toolCallsRoutes);
