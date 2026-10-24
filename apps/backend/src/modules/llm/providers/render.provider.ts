import { AppError } from "../../../core/errors/app-error";
import type { LlmGenerateTextInput, LlmGenerateTextOutput, LlmProvider } from "../llm.provider";

/** Authenticated CPU inference hosted on Render; no browser receives this credential. */
export class RenderLlmProvider implements LlmProvider {
  readonly name = "render" as const;
  readonly defaultModel = "sara-qwen-0.5b";
  readonly defaultBaseUrl = "http://127.0.0.1:10000/v1";
  async generateText(input: LlmGenerateTextInput): Promise<LlmGenerateTextOutput> {
    const response = await fetch(`${input.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST", redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({model: input.model, messages: [
        {role:"system",content:input.systemPrompt},{role:"user",content:input.userPrompt}
      ], temperature:0, max_tokens:input.maxOutputTokens ?? 128, stream:false,
      ...(input.responseSchema ? {response_format:{type:"json_schema",json_schema:{name:"ecology",strict:true,schema:input.responseSchema}}} : {})}),
      signal:AbortSignal.timeout(input.timeoutMs),
    });
    if (!response.ok) throw new AppError("LLM_RENDER_UNAVAILABLE",502,`Render inference returned HTTP ${response.status}`);
    const body = await response.json() as {choices?:Array<{message?:{content?:string};finish_reason?:string}>};
    const choice=body.choices?.[0];
    const text=choice?.message?.content?.trim();
    if (!text || choice?.finish_reason === "length") throw new AppError("LLM_RENDER_INVALID",502,"Local model returned empty or truncated output");
    return {text,provider:this.name,model:input.model};
  }
}
