import type { Request, Response } from "express";
import { sendOk } from "../../core/http/response";
import { llmService } from "./llm.service";
import type { GenerateLlmInput } from "./llm.schemas";

export class LlmController {
  async generate(req: Request, res: Response): Promise<void> {
    const payload = req.body as GenerateLlmInput;
    const result = await llmService.generate(payload);
    sendOk(res, result);
  }
}

export const llmController = new LlmController();
