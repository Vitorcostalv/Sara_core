import { z } from "zod";

export const supportedAudioMimeTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac"
] as const;

const supportedAudioMimeTypeSet = new Set<string>(supportedAudioMimeTypes);

export function isSupportedAudioMimeType(mimeType: string) {
  if (supportedAudioMimeTypeSet.has(mimeType)) {
    return true;
  }

  const normalizedMimeType = mimeType.split(";")[0]?.trim();

  return typeof normalizedMimeType === "string" && supportedAudioMimeTypeSet.has(normalizedMimeType);
}

export const voiceInteractionBodySchema = z.object({
  language: z.string().trim().min(2).max(32).optional()
});

export interface VoiceInteractionResponse {
  transcription: string;
  assistantText: string | null;
  audioReplyUrl: null;
  wakeWordDetected: null;
}

export type VoiceInteractionBody = z.infer<typeof voiceInteractionBodySchema>;
