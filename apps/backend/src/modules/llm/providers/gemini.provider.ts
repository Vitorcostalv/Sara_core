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
        responseMimeType: input.responseSchema ? "application/json" : "text/plain",
        ...(input.responseSchema ? { responseJsonSchema: input.responseSchema } : {}),
        ...(input.responseSchema && /^gemini-2\.5-flash(?:$|-)/.test(input.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    });

    // A 429 can represent an exhausted daily quota; never retry it automatically.
    const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": input.apiKey,
        },
        body: requestBody,
        signal: AbortSignal.timeout(input.timeoutMs),
      });

    if (!response || !response.ok) {
      const providerMessage = response ? await readGeminiError(response) : null;
      const status = response?.status ?? 0;
      throw new AppError(
        status === 429 ? "LLM_QUOTA_EXCEEDED" : "LLM_PROVIDER_REQUEST_FAILED",
        status === 429 ? 429 : 502,
        status === 429 ? "A quota do Gemini foi atingida. A consulta de texto está indisponível; cenários e previsões continuam disponíveis." : providerMessage ?? `Gemini request failed with status ${status}`,
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
