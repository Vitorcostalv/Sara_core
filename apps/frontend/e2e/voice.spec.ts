import { expect, test } from "@playwright/test";
import { buildPaginationMeta, fulfillAudio, fulfillJson, installMockApi } from "./support/api-mocks";

function createVoiceFile(name = "sample.webm") {
  return {
    name,
    mimeType: "audio/webm",
    buffer: Buffer.from("fake-audio")
  };
}

const conversationTurnsResponse = {
  data: [
    {
      id: "turn-1",
      userId: "local-user",
      role: "assistant",
      content: "Historico carregado",
      source: "voice-assistant",
      createdAt: "2026-05-01T18:00:00.000Z"
    }
  ],
  meta: buildPaginationMeta({
    page: 1,
    pageSize: 10,
    total: 1
  })
};

test("Voice: upload, loading, resultado e nova tentativa funcionam sem travar", async ({ page }) => {
  let attemptIndex = 0;
  const responses = [
    {
      transcription: "Primeira transcricao",
      assistantText: "Primeira resposta auditada",
      audioReplyUrl: null,
      wakeWordDetected: null
    },
    {
      transcription: "Segunda transcricao",
      assistantText: "Segunda resposta auditada",
      audioReplyUrl: null,
      wakeWordDetected: null
    }
  ];

  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: async (route) => {
        const response = responses[Math.min(attemptIndex, responses.length - 1)];
        attemptIndex += 1;
        await new Promise((resolve) => setTimeout(resolve, 150));
        await fulfillJson(route, response);
      }
    }
  ]);

  await page.goto("/voice");

  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("first.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByText("Executando STT, LLM, TTS e persistencia...")).toBeVisible();
  await expect(page.getByTestId("voice-transcription-card")).toContainText("Primeira transcricao");
  await expect(page.getByTestId("voice-assistant-card")).toContainText("Primeira resposta auditada");

  await page.getByTestId("voice-clear").click();
  await expect(page.getByTestId("voice-transcription-card")).toContainText(
    "Nenhuma transcricao disponivel ainda"
  );

  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("second.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-transcription-card")).toContainText("Segunda transcricao");
  await expect(page.getByTestId("voice-assistant-card")).toContainText("Segunda resposta auditada");
});

test("Voice: transcription vazia exibe notice sem quebrar o fluxo", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: (route) =>
        fulfillJson(route, {
          transcription: "",
          assistantText: "Nao consegui entender o audio com clareza.",
          audioReplyUrl: null,
          wakeWordDetected: null
        })
    }
  ]);

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("empty.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-notice")).toContainText(
    "O backend processou o audio, mas a transcricao voltou vazia."
  );
  await expect(page.getByTestId("voice-assistant-card")).toContainText(
    "Nao consegui entender o audio com clareza."
  );
});

test("Voice: erro 401 mostra mensagem de integracao segura", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: (route) =>
        fulfillJson(
          route,
          {
            error: {
              code: "AUTH_UNAUTHORIZED",
              message: "A valid API key is required for this endpoint."
            }
          },
          {
            status: 401
          }
        )
    }
  ]);

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("unauthorized.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-error")).toContainText(
    "A API recusou a tentativa atual. Verifique a chave de integracao configurada neste ambiente."
  );
});

test("Voice: erro 429 mostra retry-after e permite nova leitura visual", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: (route) =>
        fulfillJson(
          route,
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests for this endpoint. Retry after the current rate-limit window."
            }
          },
          {
            status: 429,
            headers: {
              "Retry-After": "12"
            }
          }
        )
    }
  ]);

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("rate-limited.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-error")).toContainText(
    "Limite temporario de voz atingido. Aguarde cerca de 12s antes de tentar novamente."
  );
  await expect(page.getByTestId("voice-submit")).toBeEnabled();
});

const TTS_REQUEST_ID = "aaaaaaaa-bbbb-cccc-dddd-111111111111";
const TTS_AUDIO_URL_PATH = `voice/audio/${TTS_REQUEST_ID}`;

function withStandardMocks(
  page: Parameters<typeof installMockApi>[0],
  voiceHandler: Parameters<typeof installMockApi>[1][number]["handler"]
) {
  return installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: voiceHandler
    }
  ]);
}

test("Voice TTS: resultado com audioReplyUrl exibe player de audio", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: (route) =>
        fulfillJson(route, {
          requestId: TTS_REQUEST_ID,
          transcription: "Qual a temperatura hoje?",
          assistantText: "Hoje esta a 25 graus em Sao Paulo.",
          audioReplyUrl: TTS_AUDIO_URL_PATH,
          wakeWordDetected: null
        })
    },
    {
      pathname: /^\/voice\/audio\//,
      handler: (route) => fulfillAudio(route)
    }
  ]);

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("tts-test.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-assistant-card")).toContainText("Hoje esta a 25 graus em Sao Paulo.");
  await expect(page.getByTestId("voice-audio-player")).toBeVisible();
  await expect(page.getByTestId("voice-audio-play-btn")).toBeVisible();
  await expect(page.getByTestId("voice-audio-play-btn")).toContainText("Reproduzir resposta");
});

test("Voice TTS: resultado sem audioReplyUrl nao exibe player", async ({ page }) => {
  await withStandardMocks(page, (route) =>
    fulfillJson(route, {
      transcription: "Teste sem audio.",
      assistantText: "Resposta apenas em texto.",
      audioReplyUrl: null,
      wakeWordDetected: null
    })
  );

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("no-tts.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-assistant-card")).toContainText("Resposta apenas em texto.");
  await expect(page.getByTestId("voice-audio-player")).not.toBeVisible();
});

test("Voice TTS: erro ao carregar audio exibe estado de Audio indisponivel", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: (route) =>
        fulfillJson(route, {
          requestId: TTS_REQUEST_ID,
          transcription: "Pergunta sobre o tempo.",
          assistantText: "Resposta com audio indisponivel.",
          audioReplyUrl: TTS_AUDIO_URL_PATH,
          wakeWordDetected: null
        })
    },
    {
      pathname: /^\/voice\/audio\//,
      handler: (route) => fulfillAudio(route, { status: 404 })
    }
  ]);

  await page.goto("/voice");
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("audio-error.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-assistant-card")).toContainText("Resposta com audio indisponivel.");
  await expect(page.getByTestId("voice-audio-unavailable")).toBeVisible();
  await expect(page.getByTestId("voice-audio-unavailable")).toContainText("Audio indisponivel");
  await expect(page.getByTestId("voice-audio-play-btn")).not.toBeVisible();
});

test("Voice TTS: nova tentativa limpa estado de erro do audio", async ({ page }) => {
  let attemptIndex = 0;
  const audioUuids = [
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
  ];

  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/conversation-turns",
      handler: (route) => fulfillJson(route, conversationTurnsResponse)
    },
    {
      method: "POST",
      pathname: "/voice/interactions",
      handler: async (route) => {
        const uuid = audioUuids[Math.min(attemptIndex, audioUuids.length - 1)] ?? audioUuids[0];
        attemptIndex += 1;
        await fulfillJson(route, {
          requestId: uuid,
          transcription: `Tentativa ${attemptIndex}`,
          assistantText: `Resposta ${attemptIndex}`,
          audioReplyUrl: `voice/audio/${uuid}`,
          wakeWordDetected: null
        });
      }
    },
    {
      pathname: /^\/voice\/audio\/bbbbbbbb/,
      handler: (route) => fulfillAudio(route, { status: 404 })
    },
    {
      pathname: /^\/voice\/audio\/cccccccc/,
      handler: (route) => fulfillAudio(route)
    }
  ]);

  await page.goto("/voice");

  // Primeira tentativa: audio com erro
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("attempt1.webm"));
  await page.getByTestId("voice-submit").click();
  await expect(page.getByTestId("voice-audio-unavailable")).toBeVisible();

  // Limpa e resubmete: audio ok, player deve aparecer limpo
  await page.getByTestId("voice-clear").click();
  await page.getByTestId("voice-file-input").setInputFiles(createVoiceFile("attempt2.webm"));
  await page.getByTestId("voice-submit").click();

  await expect(page.getByTestId("voice-audio-unavailable")).not.toBeVisible();
  await expect(page.getByTestId("voice-audio-play-btn")).toBeVisible();
  await expect(page.getByTestId("voice-audio-play-btn")).toContainText("Reproduzir resposta");
});
