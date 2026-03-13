import type { ConversationTurn } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { ConversationTurnsRepository } from "./conversation-turns.repository";
import type {
  CreateConversationTurnInput,
  ListConversationTurnsQuery
} from "./conversation-turns.schemas";

const conversationTurnsLogger = logger.child({ module: "conversation-turns-service" });

export interface ConversationTurnsRepositoryContract {
  list(query: ListConversationTurnsQuery): PaginatedResult<ConversationTurn>;
  create(input: CreateConversationTurnInput): ConversationTurn;
  findById(id: string): ConversationTurn | null;
}

export class ConversationTurnsService {
  constructor(private readonly repository: ConversationTurnsRepositoryContract) {}

  listConversationTurns(query: ListConversationTurnsQuery): PaginatedResult<ConversationTurn> {
    conversationTurnsLogger.debug({ query }, "Listing conversation turns");
    return this.repository.list(query);
  }

  createConversationTurn(input: CreateConversationTurnInput): ConversationTurn {
    return this.repository.create(input);
  }

  getConversationTurnById(id: string): ConversationTurn {
    const turn = this.repository.findById(id);

    if (!turn) {
      throw new AppError("CONVERSATION_TURN_NOT_FOUND", 404, "Conversation turn not found");
    }

    return turn;
  }
}

export const conversationTurnsService = new ConversationTurnsService(new ConversationTurnsRepository());
