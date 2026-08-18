import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../app";
import { env } from "../config/env";
import { ecologicalLlmService } from "../modules/ecology/llm/ecological-llm.service";

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

test("HTTP integration: health stays public while ecology.generate requires the configured API key", async () => {
  const originalAuthMode = env.authMode;
  const originalApiAuthKey = env.apiAuthKey;
  const originalGenerate = ecologicalLlmService.generate.bind(ecologicalLlmService);

  env.authMode = "api-key";
  env.apiAuthKey = "integration-secret";
  ecologicalLlmService.generate = (async () => ({
    provider: "mock",
    model: "mock-model",
    answer: null,
    dryRun: true,
    queryType: "factual",
    contextPreview: "Grounded context",
    factsUsed: 0,
    ecosystemsFound: [],
    warnings: [],
    inspection: null,
    groundingCoverage: "insufficient",
  })) as typeof ecologicalLlmService.generate;

  try {
    await withTestServer(async (baseUrl) => {
      const healthResponse = await fetch(`${baseUrl}/api/v1/health`);
      assert.equal(healthResponse.status, 200);

      const unauthorizedResponse = await fetch(`${baseUrl}/api/v1/ecology/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "auditar auth", dryRun: true }),
      });
      assert.equal(unauthorizedResponse.status, 401);

      const authorizedResponse = await fetch(`${baseUrl}/api/v1/ecology/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sara-api-key": "integration-secret",
        },
        body: JSON.stringify({ prompt: "auditar auth", dryRun: true }),
      });
      assert.equal(authorizedResponse.status, 200);
    });
  } finally {
    env.authMode = originalAuthMode;
    env.apiAuthKey = originalApiAuthKey;
    ecologicalLlmService.generate = originalGenerate;
  }
});

test("HTTP integration: oversized JSON returns 413 instead of a generic 500", async () => {
  const originalAuthMode = env.authMode;
  const originalMaxBytes = env.apiJsonMaxBytes;
  env.authMode = "disabled";
  env.apiJsonMaxBytes = 128;

  try {
    await withTestServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/ecology/fauna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biomes: ["cerrado"], padding: "x".repeat(256) }),
      });
      assert.equal(response.status, 413);
      const payload = (await response.json()) as { error: { code: string } };
      assert.equal(payload.error.code, "PAYLOAD_TOO_LARGE");
    });
  } finally {
    env.authMode = originalAuthMode;
    env.apiJsonMaxBytes = originalMaxBytes;
  }
});
