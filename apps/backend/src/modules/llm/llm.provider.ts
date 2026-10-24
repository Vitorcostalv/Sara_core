import { AppError } from "../../core/errors/app-error";
import { GeminiLlmProvider } from "./providers/gemini.provider";
import { RenderLlmProvider } from "./providers/render.provider";
import { GrokLlmProvider } from "./providers/grok.provider";

export type LlmProviderName = "disabled" | "gemini" | "grok" | "render";

export interface LlmGenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface LlmGenerateTextOutput {
  text: string;
  provider?: string;
  model?: string;
  fallbackReason?: string;
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
    case "render":
      return new RenderLlmProvider();
    case "grok":
      return new GrokLlmProvider();
    case "disabled":
      return null;
    default:
      throw new AppError("LLM_PROVIDER_INVALID", 500, `Unsupported LLM provider: ${providerName}`);
  }
}
