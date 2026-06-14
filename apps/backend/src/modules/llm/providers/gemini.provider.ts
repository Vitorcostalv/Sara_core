import { AppError } from "../../../core/errors/app-error";
import type { LlmGenerateTextInput, LlmGenerateTextOutput, LlmProvider } from "../llm.provider";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function readGeminiError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return payload.error?.message ?? null;
  } catch {
    return null;
  }
}

const MAX_RETRIES_429 = 2; // free tier (20 req/min) → tolerate brief quota bursts
const DEFAULT_BACKOFF_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Honour Retry-After (seconds) when present, else exponential backoff capped at 8s.
function backoffMsFor(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header && /^\d+$/.test(header)) {
    return Math.min(8_000, Number.parseInt(header, 10) * 1_000);
  }
  return Math.min(8_000, DEFAULT_BACKOFF_MS * 2 ** attempt);
}

export class GeminiLlmProvider implements LlmProvider {
  readonly name = "gemini" as const;
  readonly defaultModel = "gemini-2.5-flash";
  readonly defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta";

  async generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextOutput> {
    const url = `${input.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent`;
    const requestBody = JSON.stringify({
      system_instruction: {
        parts: [{ text: input.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "text/plain",
      },
    });

    let response: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt += 1) {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": input.apiKey,
        },
        body: requestBody,
        signal: AbortSignal.timeout(input.timeoutMs),
      });

      // Quota exceeded: wait (respecting Retry-After) and retry a bounded number of times.
      if (response.status === 429 && attempt < MAX_RETRIES_429) {
        await sleep(backoffMsFor(response, attempt));
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      const providerMessage = response ? await readGeminiError(response) : null;
      const status = response?.status ?? 0;
      throw new AppError(
        "LLM_PROVIDER_REQUEST_FAILED",
        502,
        providerMessage ?? `Gemini request failed with status ${status}`,
        {
          provider: this.name,
          status,
        }
      );
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const text = payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter((part) => part.length > 0)
      .join("\n")
      .trim();

    if (!text) {
      throw new AppError("LLM_EMPTY_RESPONSE", 502, "Gemini returned an empty response");
    }

    return { text };
  }
}
