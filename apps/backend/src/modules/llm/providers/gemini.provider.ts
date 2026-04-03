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

export class GeminiLlmProvider implements LlmProvider {
  readonly name = "gemini" as const;
  readonly defaultModel = "gemini-2.5-flash";
  readonly defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta";

  async generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextOutput> {
    const response = await fetch(`${input.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
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
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    });

    if (!response.ok) {
      const providerMessage = await readGeminiError(response);
      throw new AppError(
        "LLM_PROVIDER_REQUEST_FAILED",
        502,
        providerMessage ?? `Gemini request failed with status ${response.status}`,
        {
          provider: this.name,
          status: response.status,
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
