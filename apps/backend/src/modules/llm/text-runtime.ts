import { env } from "../../config/env";
import { createLlmProvider } from "./llm.provider";

/** The own model uses its own server credentials. No implicit cloud fallback. */
export function textLlmRuntime(factory = createLlmProvider) {
  const own = env.llmProvider === "render";
  const permitted = own || env.llmCloudEnabled;
  const provider = permitted ? factory(env.llmProvider) : null;
  return {
    own, permitted, provider,
    model: own ? "sara-qwen-0.5b" : env.llmModel || provider?.defaultModel || "not-configured",
    apiKey: own ? env.renderLlmApiKey : env.llmApiKey,
    baseUrl: own ? env.renderLlmBaseUrl ?? "" : env.llmBaseUrl ?? provider?.defaultBaseUrl ?? "",
    timeoutMs: own ? env.renderLlmTimeoutMs : env.llmTimeoutMs,
  };
}
