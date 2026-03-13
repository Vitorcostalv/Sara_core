import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk, sendPaginated } from "../../core/http/response";
import { factsService } from "./facts.service";
import type {
  CreateFactInput,
  FactIdParam,
  ListFactsQuery,
  MarkFactImportantInput,
  UpdateFactInput
} from "./facts.schemas";

export class FactsController {
  list(req: Request, res: Response): void {
    const query = req.query as unknown as ListFactsQuery;
    const result = factsService.listFacts(query);
    sendPaginated(res, result.items, { page: query.page, pageSize: query.pageSize }, result.total);
  }

  create(req: Request, res: Response): void {
    const payload = req.body as CreateFactInput;
    const fact = factsService.createFact(payload);
    sendCreated(res, fact);
  }

  getById(req: Request, res: Response): void {
    const params = req.params as FactIdParam;
    const fact = factsService.getFactById(params.id);
    sendOk(res, fact);
  }

  update(req: Request, res: Response): void {
    const params = req.params as FactIdParam;
    const payload = req.body as UpdateFactInput;
    const fact = factsService.updateFact(params.id, payload);
    sendOk(res, fact);
  }

  markImportant(req: Request, res: Response): void {
    const params = req.params as FactIdParam;
    const payload = req.body as MarkFactImportantInput;
    const fact = factsService.markFactImportant(params.id, payload);
    sendOk(res, fact);
  }

  remove(req: Request, res: Response): void {
    const params = req.params as FactIdParam;
    factsService.deleteFact(params.id);
    sendNoContent(res);
  }
}

export const factsController = new FactsController();
