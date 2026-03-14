import type { Request, Response } from "express";
import { AppError } from "../../core/errors/app-error";
import { voiceInteractionBodySchema } from "./voice.schemas";
import { voiceService } from "./voice.service";

type VoiceRequest = Request & {
  file?: Express.Multer.File;
};

export class VoiceController {
  interact(req: Request, res: Response): void {
    const voiceRequest = req as VoiceRequest;

    if (!voiceRequest.file) {
      throw new AppError("VOICE_AUDIO_REQUIRED", 400, "Audio file is required in multipart field 'audio'");
    }

    const parsedBody = voiceInteractionBodySchema.parse(req.body ?? {});
    const result = voiceService.processVoiceInteraction({
      audioBuffer: voiceRequest.file.buffer,
      mimeType: voiceRequest.file.mimetype,
      language: parsedBody.language
    });

    res.status(200).json(result);
  }
}

export const voiceController = new VoiceController();
