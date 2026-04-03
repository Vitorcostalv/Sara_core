import { Router } from "express";
import { conversationTurnsRoutes } from "../../modules/conversation-turns/conversation-turns.routes";
import { factsRoutes } from "../../modules/facts/facts.routes";
import { healthRoutes } from "../../modules/health/health.routes";
import { llmRoutes } from "../../modules/llm/llm.routes";
import { tasksRoutes } from "../../modules/tasks/tasks.routes";
import { toolCallsRoutes } from "../../modules/tool-calls/tool-calls.routes";
import { userProfileRoutes } from "../../modules/user-profile/user-profile.routes";
import { voiceRoutes } from "../../modules/voice/voice.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/tasks", tasksRoutes);
apiRouter.use("/facts", factsRoutes);
apiRouter.use("/conversation-turns", conversationTurnsRoutes);
apiRouter.use("/tool-calls", toolCallsRoutes);
apiRouter.use("/user-profile", userProfileRoutes);
apiRouter.use("/voice", voiceRoutes);
apiRouter.use("/llm", llmRoutes);
