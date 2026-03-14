import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import { voiceController } from "./voice.controller";
import { isSupportedAudioMimeType, supportedAudioMimeTypes } from "./voice.schemas";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.sttAudioMaxBytes,
    files: 1
  }
});

type UploadedAudioRequest = Request & {
  file?: Express.Multer.File;
};

function parseVoiceUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("audio")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            "VOICE_AUDIO_TOO_LARGE",
            413,
            `Audio file exceeds maximum allowed size (${env.sttAudioMaxBytes} bytes)`
          )
        );
        return;
      }

      next(new AppError("VOICE_AUDIO_UPLOAD_ERROR", 400, error.message));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    const uploadedAudio = (req as UploadedAudioRequest).file;

    if (uploadedAudio && !isSupportedAudioMimeType(uploadedAudio.mimetype)) {
      next(
        new AppError("VOICE_AUDIO_UNSUPPORTED_TYPE", 415, `Unsupported audio mime type: ${uploadedAudio.mimetype}`, {
          supportedMimeTypes: supportedAudioMimeTypes
        })
      );
      return;
    }

    next();
  });
}

export const voiceRoutes = Router();

voiceRoutes.post("/interactions", parseVoiceUpload, voiceController.interact.bind(voiceController));
