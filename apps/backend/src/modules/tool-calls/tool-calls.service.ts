import type { ToolCall } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { ToolCallsRepository } from "./tool-calls.repository";
import type { CreateToolCallInput, ListToolCallsQuery, UpdateToolCallStatusInput } from "./tool-calls.schemas";

const toolCallsLogger = logger.child({ module: "tool-calls-service" });

export interface ToolCallsRepositoryContract {
  list(query: ListToolCallsQuery): PaginatedResult<ToolCall>;
  create(input: CreateToolCallInput): ToolCall;
  findById(id: string): ToolCall | null;
  updateStatusById(id: string, input: UpdateToolCallStatusInput): ToolCall | null;
  conversationTurnExists(conversationTurnId: string): boolean;
}

export class ToolCallsService {
  constructor(private readonly repository: ToolCallsRepositoryContract) {}

  listToolCalls(query: ListToolCallsQuery): PaginatedResult<ToolCall> {
    return this.repository.list(query);
  }

  createToolCall(input: CreateToolCallInput): ToolCall {
    toolCallsLogger.debug(
      { conversationTurnId: input.conversationTurnId, toolName: input.toolName, status: input.status },
      "Creating tool call log"
    );

    const turnExists = this.repository.conversationTurnExists(input.conversationTurnId);

    if (!turnExists) {
      throw new AppError("CONVERSATION_TURN_NOT_FOUND", 404, "Conversation turn not found");
    }

    return this.repository.create(input);
  }

  getToolCallById(id: string): ToolCall {
    const toolCall = this.repository.findById(id);

    if (!toolCall) {
      throw new AppError("TOOL_CALL_NOT_FOUND", 404, "Tool call not found");
    }

    return toolCall;
  }

  updateToolCallStatus(id: string, input: UpdateToolCallStatusInput): ToolCall {
    const toolCall = this.repository.updateStatusById(id, input);

    if (!toolCall) {
      throw new AppError("TOOL_CALL_NOT_FOUND", 404, "Tool call not found");
    }

    return toolCall;
  }
}

export const toolCallsService = new ToolCallsService(new ToolCallsRepository());
