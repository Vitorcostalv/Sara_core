import type { NextFunction, Request, Response } from "express";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env";
import { asyncHandler } from "../../core/http/async-handler";
import { AppError } from "../../core/errors/app-error";
import { createMemoryRateLimiter } from "../../core/middleware/rate-limit";
import { voiceController } from "./voice.controller";
import { isSupportedAudioMimeType, supportedAudioMimeTypes } from "./voice.schemas";

type UploadedAudioRequest = Request & {
  file?: Express.Multer.File;
};

function parseVoiceUpload(req: Request, res: Response, next: NextFunction): void {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: env.sttAudioMaxBytes,
      files: 1
    }
  });

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
const voiceRateLimiter = createMemoryRateLimiter({
  keyPrefix: "voice-interactions",
  windowMs: env.voiceRateLimitWindowMs,
  maxRequests: env.voiceRateLimitMax
});

voiceRoutes.post(
  "/interactions",
  voiceRateLimiter,
  parseVoiceUpload,
  asyncHandler(voiceController.interact.bind(voiceController))
);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ttsOutputDir = path.resolve(env.repositoryRoot, ".tmp", "tts");

voiceRoutes.get("/audio/:requestId", (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.params["requestId"] ?? "";

  if (!UUID_PATTERN.test(requestId)) {
    next(new AppError("VOICE_AUDIO_NOT_FOUND", 404, "Audio file not found"));
    return;
  }

  const audioPath = path.resolve(ttsOutputDir, `${requestId}.mp3`);

  if (!audioPath.startsWith(ttsOutputDir + path.sep) && audioPath !== ttsOutputDir) {
    next(new AppError("VOICE_AUDIO_NOT_FOUND", 404, "Audio file not found"));
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "private, max-age=900");
  res.setHeader("Accept-Ranges", "bytes");

  res.sendFile(audioPath, (err) => {
    if (err && !res.headersSent) {
      next(new AppError("VOICE_AUDIO_NOT_FOUND", 404, "Audio file not found or expired"));
    }
  });
});
