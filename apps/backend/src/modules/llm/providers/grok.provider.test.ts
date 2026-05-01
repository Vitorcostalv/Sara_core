import assert from "node:assert/strict";
import test from "node:test";
import { GrokLlmProvider } from "./grok.provider";

test("GrokLlmProvider sends the grounded request and parses text responses", async () => {
  const provider = new GrokLlmProvider();
  const originalFetch = globalThis.fetch;
  let receivedUrl = "";
  let receivedPayload: unknown = null;

  globalThis.fetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedPayload = init?.body ? JSON.parse(String(init.body)) : null;

    return new Response(
      JSON.stringify({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Grounded answer from Grok." }],
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
      model: "grok-4.20-mini",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      timeoutMs: 1_000,
    });

    assert.equal(receivedUrl, "https://example.test/v1/responses");
    assert.equal(result.text, "Grounded answer from Grok.");
    assert.deepEqual(receivedPayload, {
      model: "grok-4.20-mini",
      input: [
        {
          role: "system",
          content: "Grounding policy",
        },
        {
          role: "user",
          content: "User request",
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
