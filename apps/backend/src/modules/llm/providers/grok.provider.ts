import { AppError } from "../../../core/errors/app-error";
import type { LlmGenerateTextInput, LlmGenerateTextOutput, LlmProvider } from "../llm.provider";

interface GrokResponsesApiPayload {
  output?: Array<{
    type?: string;
    text?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

async function readGrokError(response: Response) {
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

export class GrokLlmProvider implements LlmProvider {
  readonly name = "grok" as const;
  readonly defaultModel = "grok-4.20-mini";
  readonly defaultBaseUrl = "https://api.x.ai/v1";

  async generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextOutput> {
    const response = await fetch(`${input.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        input: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          {
            role: "user",
            content: input.userPrompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    });

    if (!response.ok) {
      const providerMessage = await readGrokError(response);
      throw new AppError(
        "LLM_PROVIDER_REQUEST_FAILED",
        502,
        providerMessage ?? `Grok request failed with status ${response.status}`,
        {
          provider: this.name,
          status: response.status,
        }
      );
    }

    const payload = (await response.json()) as GrokResponsesApiPayload;
    const text = payload.output
      ?.flatMap((item) => {
        if (typeof item.text === "string") {
          return [item.text];
        }

        return (item.content ?? [])
          .map((contentPart) => contentPart.text?.trim() ?? "")
          .filter((contentText) => contentText.length > 0);
      })
      .join("\n")
      .trim();

    if (!text) {
      throw new AppError("LLM_EMPTY_RESPONSE", 502, "Grok returned an empty response");
    }

    return { text };
  }
}
