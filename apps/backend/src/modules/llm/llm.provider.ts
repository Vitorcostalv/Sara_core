import { AppError } from "../../core/errors/app-error";
import type { LlmProviderName } from "./llm.schemas";
import { GeminiLlmProvider } from "./providers/gemini.provider";
import { GrokLlmProvider } from "./providers/grok.provider";

export interface LlmGenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

export interface LlmGenerateTextOutput {
  text: string;
}

export interface LlmProvider {
  readonly name: Exclude<LlmProviderName, "disabled">;
  readonly defaultModel: string;
  readonly defaultBaseUrl: string;
  generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextOutput>;
}

export function createLlmProvider(providerName: LlmProviderName): LlmProvider | null {
  switch (providerName) {
    case "gemini":
      return new GeminiLlmProvider();
    case "grok":
      return new GrokLlmProvider();
    case "disabled":
      return null;
    default:
      throw new AppError("LLM_PROVIDER_INVALID", 500, `Unsupported LLM provider: ${providerName}`);
  }
}
