import assert from "node:assert/strict";
import test from "node:test";
import { GeminiLlmProvider } from "./gemini.provider";

test("GeminiLlmProvider requests native structured JSON when a schema is supplied", async () => {
  const originalFetch = globalThis.fetch;
  const schema = { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] };
  globalThis.fetch = (async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(payload.generationConfig.responseJsonSchema, schema);
    return Response.json({ candidates: [{ content: { parts: [{ text: '{"summary":"ok"}' }] } }] });
  }) as typeof fetch;
  try {
    const result = await new GeminiLlmProvider().generateText({ systemPrompt: "policy", userPrompt: "data", model: "mock", apiKey: "test", baseUrl: "https://mock.invalid", timeoutMs: 1000, responseSchema: schema });
    assert.deepEqual(JSON.parse(result.text), { summary: "ok" });
  } finally { globalThis.fetch = originalFetch; }
});

test("GeminiLlmProvider sends the grounded request and parses text responses", async () => {
  const provider = new GeminiLlmProvider();
  const originalFetch = globalThis.fetch;
  let receivedUrl = "";
  let receivedPayload: unknown = null;

  globalThis.fetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedPayload = init?.body ? JSON.parse(String(init.body)) : null;

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "Grounded answer from Gemini." }],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  try {
    const result = await provider.generateText({
      systemPrompt: "Grounding policy",
      userPrompt: "User request",
      model: "gemini-2.5-flash",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1beta",
      timeoutMs: 1_000,
    });

    assert.equal(receivedUrl, "https://example.test/v1beta/models/gemini-2.5-flash:generateContent");
    assert.equal(result.text, "Grounded answer from Gemini.");
    assert.deepEqual(receivedPayload, {
      system_instruction: {
        parts: [{ text: "Grounding policy" }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: "User request" }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "text/plain",
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
