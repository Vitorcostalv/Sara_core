import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk, sendPaginated } from "../../core/http/response";
import { factsService } from "./facts.service";
import type {
  CreateFactInput,
  FactIdParam,
  ListFactsQuery,
  MarkFactImportantInput,
  UpdateFactInput,
} from "./facts.schemas";

export class FactsController {
  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListFactsQuery;
    const result = await factsService.listFacts(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  async create(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateFactInput;
    const fact = await factsService.createFact(payload);
    sendCreated(res, fact);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const params = req.params as FactIdParam;
    const fact = await factsService.getFactById(params.id);
    sendOk(res, fact);
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = req.params as FactIdParam;
    const payload = req.body as UpdateFactInput;
    const fact = await factsService.updateFact(params.id, payload);
    sendOk(res, fact);
  }

  async markImportant(req: Request, res: Response): Promise<void> {
    const params = req.params as FactIdParam;
    const payload = req.body as MarkFactImportantInput;
    const fact = await factsService.markFactImportant(params.id, payload);
    sendOk(res, fact);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const params = req.params as FactIdParam;
    await factsService.deleteFact(params.id);
    sendNoContent(res);
  }
}

export const factsController = new FactsController();
