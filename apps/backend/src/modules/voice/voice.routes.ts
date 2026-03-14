import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import { voiceController } from "./voice.controller";
import { isSupportedAudioMimeType, supportedAudioMimeTypes } from "./voice.schemas";

type MulterModule = typeof import("multer");

type UploadedAudioRequest = Request & {
  file?: Express.Multer.File;
};

function parseVoiceUpload(req: Request, res: Response, next: NextFunction): void {
  let multerModule: MulterModule;

  try {
    multerModule = require("multer") as MulterModule;
  } catch {
    next(
      new AppError(
        "VOICE_UPLOAD_DEPENDENCY_MISSING",
        500,
        "Multer dependency is missing. Run npm install before using voice uploads."
      )
    );
    return;
  }

  const upload = multerModule({
    storage: multerModule.memoryStorage(),
    limits: {
      fileSize: env.sttAudioMaxBytes,
      files: 1
    }
  });

  upload.single("audio")(req, res, (error: unknown) => {
    if (error instanceof multerModule.MulterError) {
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
