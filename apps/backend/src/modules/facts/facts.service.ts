import type { Fact } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import type { PaginatedResult } from "../../core/http/pagination";
import { logger } from "../../logging/logger";
import { FactsRepository } from "./facts.repository";
import type {
  CreateFactInput,
  ListFactsQuery,
  MarkFactImportantInput,
  UpdateFactInput,
} from "./facts.schemas";

const factsLogger = logger.child({ module: "facts-service" });

export interface FactsRepositoryContract {
  list(query: ListFactsQuery): Promise<PaginatedResult<Fact>>;
  create(input: CreateFactInput): Promise<Fact>;
  findById(id: string): Promise<Fact | null>;
  updateById(id: string, input: UpdateFactInput): Promise<Fact | null>;
  markImportantById(id: string, isImportant: boolean): Promise<Fact | null>;
  deleteById(id: string): Promise<boolean>;
}

export class FactsService {
  constructor(private readonly repository: FactsRepositoryContract) {}

  async listFacts(query: ListFactsQuery): Promise<PaginatedResult<Fact>> {
    factsLogger.debug({ query }, "Listing facts");
    return this.repository.list(query);
  }

  async createFact(input: CreateFactInput): Promise<Fact> {
    factsLogger.debug({ userId: input.userId, key: input.key }, "Creating fact");
    return this.repository.create(input);
  }

  async getFactById(id: string): Promise<Fact> {
    const fact = await this.repository.findById(id);
    if (!fact) throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    return fact;
  }

  async updateFact(id: string, input: UpdateFactInput): Promise<Fact> {
    const fact = await this.repository.updateById(id, input);
    if (!fact) throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    return fact;
  }

  async markFactImportant(id: string, input: MarkFactImportantInput): Promise<Fact> {
    const fact = await this.repository.markImportantById(id, input.isImportant);
    if (!fact) throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
    return fact;
  }

  async deleteFact(id: string): Promise<void> {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new AppError("FACT_NOT_FOUND", 404, "Fact not found");
  }
}

export const factsService = new FactsService(new FactsRepository());
