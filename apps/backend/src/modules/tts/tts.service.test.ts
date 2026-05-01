import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import type { TtsProvider, TtsSynthesisInput } from "./tts.provider";
import { TtsService } from "./tts.service";

const TEST_REQUEST_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function makeProvider(overrides: Partial<TtsProvider> = {}): TtsProvider {
  return {
    name: "mock-tts",
    synthesize: () => undefined,
    ...overrides,
  };
}

test("TtsService: returns null when ttsProvider is disabled", () => {
  const original = env.ttsProvider;
  env.ttsProvider = "disabled";
  try {
    const service = new TtsService();
    assert.equal(service.synthesize("Hello world", TEST_REQUEST_ID, "pt"), null);
  } finally {
    env.ttsProvider = original;
  }
});

test("TtsService: returns null when text is empty or whitespace-only", () => {
  const original = env.ttsProvider;
  env.ttsProvider = "python-gtts";
  try {
    const service = new TtsService(() => makeProvider());
    assert.equal(service.synthesize("   ", TEST_REQUEST_ID, "pt"), null);
    assert.equal(service.synthesize("", TEST_REQUEST_ID, "pt"), null);
  } finally {
    env.ttsProvider = original;
  }
});

test("TtsService: returns null without throwing when provider throws", () => {
  const original = env.ttsProvider;
  env.ttsProvider = "python-gtts";
  try {
    const service = new TtsService(() =>
      makeProvider({
        synthesize: () => {
          throw new AppError("TTS_SYNTHESIS_FAILED", 500, "Mock failure");
        },
      })
    );
    const result = service.synthesize("Texto de teste", TEST_REQUEST_ID, "pt");
    assert.equal(result, null);
  } finally {
    env.ttsProvider = original;
  }
});

test("TtsService: returns voice/audio/{requestId} on successful synthesis", () => {
  const original = env.ttsProvider;
  env.ttsProvider = "python-gtts";
  try {
    const service = new TtsService(() => makeProvider({ synthesize: () => undefined }));
    const result = service.synthesize("Resposta da Sara.", TEST_REQUEST_ID, "pt");
    assert.equal(result, `voice/audio/${TEST_REQUEST_ID}`);
  } finally {
    env.ttsProvider = original;
  }
});

test("TtsService: normalizes pt-BR language tag to pt before calling provider", () => {
  const original = env.ttsProvider;
  env.ttsProvider = "python-gtts";
  let receivedLanguage: string | null = null;
  try {
    const service = new TtsService(() =>
      makeProvider({
        synthesize: (input: TtsSynthesisInput) => {
          receivedLanguage = input.language;
        },
      })
    );
    service.synthesize("texto qualquer", TEST_REQUEST_ID, "pt-BR");
    assert.equal(receivedLanguage, "pt");
  } finally {
    env.ttsProvider = original;
  }
});

test("TtsService: truncates text to ttsAudioMaxChars before calling provider", () => {
  const originalProvider = env.ttsProvider;
  const originalMax = env.ttsAudioMaxChars;
  env.ttsProvider = "python-gtts";
  env.ttsAudioMaxChars = 10;
  let receivedText: string | null = null;
  try {
    const service = new TtsService(() =>
      makeProvider({
        synthesize: (input: TtsSynthesisInput) => {
          receivedText = input.text;
        },
      })
    );
    service.synthesize("Este texto é muito longo para o limite definido.", TEST_REQUEST_ID, "pt");
    const text = receivedText ?? "";
    assert.ok(receivedText !== null, "provider must have been called");
    assert.ok(
      text.length <= 13,
      `expected truncated text length <= 13 (10 chars + ellipsis), got ${text.length}`
    );
  } finally {
    env.ttsProvider = originalProvider;
    env.ttsAudioMaxChars = originalMax;
  }
});
