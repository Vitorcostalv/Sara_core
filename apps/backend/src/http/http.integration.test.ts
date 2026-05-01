import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createApp } from "../app";
import { env } from "../config/env";
import { resetMemoryRateLimitStore } from "../core/middleware/rate-limit";
import { llmService } from "../modules/llm/llm.service";
import { voiceService } from "../modules/voice/voice.service";

async function withTestServer(callback: (baseUrl: string) => Promise<void>) {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not resolve test server address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

test("HTTP integration: health stays public while llm.generate requires the configured API key", async () => {
  const originalAuthMode = env.authMode;
  const originalApiAuthKey = env.apiAuthKey;
  const originalLlmGenerate = llmService.generate.bind(llmService);

  env.authMode = "api-key";
  env.apiAuthKey = "integration-secret";
  llmService.generate = (async () => ({
    provider: "mock",
    model: "mock-model",
    answer: null,
    dryRun: true,
    contextPreview: "Grounded context",
    factsPreview: [],
    ecosystems: [],
    grounding: {
      userId: "local-user",
      profileIncluded: true,
      factCount: 0,
      ecosystemsUsed: [],
      warnings: [],
    },
  })) as typeof llmService.generate;

  try {
    await withTestServer(async (baseUrl) => {
      const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(healthResponse.status, 200);

      const unauthorizedResponse = await fetch(`${baseUrl}/api/v1/llm/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "auditar auth",
          ecosystems: [],
          maxFacts: 4,
          includeProfile: true,
          dryRun: true,
        }),
      });
      assert.equal(unauthorizedResponse.status, 401);

      const authorizedResponse = await fetch(`${baseUrl}/api/v1/llm/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sara-api-key": "integration-secret",
        },
        body: JSON.stringify({
          prompt: "auditar auth",
          ecosystems: [],
          maxFacts: 4,
          includeProfile: true,
          dryRun: true,
        }),
      });
      assert.equal(authorizedResponse.status, 200);
    });
  } finally {
    env.authMode = originalAuthMode;
    env.apiAuthKey = originalApiAuthKey;
    llmService.generate = originalLlmGenerate;
  }
});

test("HTTP integration: voice endpoint enforces rate limiting on repeated requests", async () => {
  const originalVoiceProcess = voiceService.processVoiceInteraction.bind(voiceService);
  const originalAuthMode = env.authMode;

  env.authMode = "disabled";
  resetMemoryRateLimitStore();

  voiceService.processVoiceInteraction = (async () => ({
    transcription: "ok",
    assistantText: "ok",
    audioReplyUrl: null,
    wakeWordDetected: null,
  })) as typeof voiceService.processVoiceInteraction;

  try {
    await withTestServer(async (baseUrl) => {
      const statuses: number[] = [];

      for (let index = 0; index < env.voiceRateLimitMax + 1; index += 1) {
        const formData = new FormData();
        formData.append(
          "audio",
          new File([Buffer.from(`audio-${randomUUID()}`)], `sample-${index}.webm`, { type: "audio/webm" })
        );

        const response = await fetch(`${baseUrl}/api/v1/voice/interactions`, {
          method: "POST",
          body: formData,
        });

        statuses.push(response.status);
      }

      assert.equal(statuses.at(-1), 429);
      assert.equal(statuses.slice(0, -1).every((status) => status === 200), true);
    });
  } finally {
    env.authMode = originalAuthMode;
    voiceService.processVoiceInteraction = originalVoiceProcess;
    resetMemoryRateLimitStore();
  }
});
