import type { ToolCall } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { ToolCallsRepository } from "./tool-calls.repository";
import type { CreateToolCallInput, ListToolCallsQuery, UpdateToolCallStatusInput } from "./tool-calls.schemas";

const toolCallsLogger = logger.child({ module: "tool-calls-service" });

export interface ToolCallsRepositoryContract {
  list(query: ListToolCallsQuery): Promise<PaginatedResult<ToolCall>>;
  create(input: CreateToolCallInput): Promise<ToolCall>;
  findById(id: string): Promise<ToolCall | null>;
  updateStatusById(id: string, input: UpdateToolCallStatusInput): Promise<ToolCall | null>;
  conversationTurnExists(conversationTurnId: string): Promise<boolean>;
}

export class ToolCallsService {
  constructor(private readonly repository: ToolCallsRepositoryContract) {}

  async listToolCalls(query: ListToolCallsQuery): Promise<PaginatedResult<ToolCall>> {
    return this.repository.list(query);
  }

  async createToolCall(input: CreateToolCallInput): Promise<ToolCall> {
    toolCallsLogger.debug(
      { conversationTurnId: input.conversationTurnId, toolName: input.toolName, status: input.status },
      "Creating tool call log"
    );

    const turnExists = await this.repository.conversationTurnExists(input.conversationTurnId);
    if (!turnExists) throw new AppError("CONVERSATION_TURN_NOT_FOUND", 404, "Conversation turn not found");

    return this.repository.create(input);
  }

  async getToolCallById(id: string): Promise<ToolCall> {
    const toolCall = await this.repository.findById(id);
    if (!toolCall) throw new AppError("TOOL_CALL_NOT_FOUND", 404, "Tool call not found");
    return toolCall;
  }

  async updateToolCallStatus(id: string, input: UpdateToolCallStatusInput): Promise<ToolCall> {
    const toolCall = await this.repository.updateStatusById(id, input);
    if (!toolCall) throw new AppError("TOOL_CALL_NOT_FOUND", 404, "Tool call not found");
    return toolCall;
  }
}

export const toolCallsService = new ToolCallsService(new ToolCallsRepository());
