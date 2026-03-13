import type { Fact } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { FactsRepository } from "./facts.repository";
import type {
  CreateFactInput,
  ListFactsQuery,
  MarkFactImportantInput,
  UpdateFactInput
} from "./facts.schemas";

const factsLogger = logger.child({ module: "facts-service" });

export interface FactsRepositoryContract {
  list(query: ListFactsQuery): PaginatedResult<Fact>;
  create(input: CreateFactInput): Fact;
  findById(id: string): Fact | null;
  updateById(id: string, input: UpdateFactInput): Fact | null;
  markImportantById(id: string, isImportant: boolean): Fact | null;
  deleteById(id: string): boolean;
}

export class FactsService {
  constructor(private readonly repository: FactsRepositoryContract) {}

  listFacts(query: ListFactsQuery): PaginatedResult<Fact> {
    factsLogger.debug({ query }, "Listing facts");
    return this.repository.list(query);
  }

  createFact(input: CreateFactInput): Fact {
    factsLogger.debug({ userId: input.userId, key: input.key }, "Creating fact");
    return this.repository.create(input);
  }

  getFactById(id: string): Fact {
    const fact = this.repository.findById(id);

    if (!fact) {
      throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    }

    return fact;
  }

  updateFact(id: string, input: UpdateFactInput): Fact {
    const fact = this.repository.updateById(id, input);

    if (!fact) {
      throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    }

    return fact;
  }

  markFactImportant(id: string, input: MarkFactImportantInput): Fact {
    const fact = this.repository.markImportantById(id, input.isImportant);

    if (!fact) {
      throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    }

    return fact;
  }

  deleteFact(id: string): void {
    const deleted = this.repository.deleteById(id);

    if (!deleted) {
      throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    }
  }
}

export const factsService = new FactsService(new FactsRepository());
