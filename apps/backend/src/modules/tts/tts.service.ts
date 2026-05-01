import { mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "../../config/env";
import { logger } from "../../logging/logger";
import { createTtsProvider, type TtsProvider } from "./tts.provider";

const ttsLogger = logger.child({ module: "tts-service" });

function normalizeLanguageTag(language: string): string {
  return (language.split("-")[0] ?? language).toLowerCase();
}

function truncateText(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trimEnd()}...`;
}

export class TtsService {
  constructor(
    private readonly providerFactory: () => TtsProvider | null = createTtsProvider
  ) {}

  synthesize(text: string, requestId: string, language: string): string | null {
    if (env.ttsProvider === "disabled") {
      return null;
    }

    const provider = this.providerFactory();
    if (!provider) {
      return null;
    }

    const normalizedText = truncateText(text, env.ttsAudioMaxChars);
    if (!normalizedText) {
      return null;
    }

    const normalizedLanguage = normalizeLanguageTag(language);
    const outputDir = path.resolve(env.repositoryRoot, ".tmp", "tts");
    const outputPath = path.resolve(outputDir, `${requestId}.mp3`);

    try {
      mkdirSync(outputDir, { recursive: true });
      provider.synthesize({
        text: normalizedText,
        language: normalizedLanguage,
        outputPath,
      });
      return `voice/audio/${requestId}`;
    } catch (error) {
      ttsLogger.warn(
        { requestId, provider: provider.name, err: error },
        "TTS synthesis failed — response will be text-only"
      );
      return null;
    }
  }
}

export const ttsService = new TtsService();
