import type { NextFunction, Request, Response } from "express";
import { sendOk } from "../../core/http/response";
import { llmService } from "./llm.service";
import type { GenerateLlmInput } from "./llm.schemas";

export class LlmController {
  generate(req: Request, res: Response, next: NextFunction): void {
    const payload = req.body as GenerateLlmInput;

    void llmService
      .generate(payload)
      .then((result) => {
        sendOk(res, result);
      })
      .catch(next);
  }
}

export const llmController = new LlmController();
