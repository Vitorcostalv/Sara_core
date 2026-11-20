import type { LlmGenerateTextInput, LlmGenerateTextOutput, LlmProvider } from "./llm.provider";
import { RenderLlmProvider } from "./providers/render.provider";
import { AppError } from "../../core/errors/app-error";

export interface LocalConfig {enabled:boolean;baseUrl:string|null;apiKey:string|null;timeoutMs:number}
/** A failed/cold local instance never disables the existing cloud provider. */
export async function generateWithLocalFallback(primary:LlmProvider|null,input:LlmGenerateTextInput,local:LocalConfig,
  validateLocal?:(text:string)=>boolean,
  localInput?:Partial<Pick<LlmGenerateTextInput,"systemPrompt"|"responseSchema"|"maxOutputTokens">>,
  normalizeLocal?:(text:string)=>string):Promise<LlmGenerateTextOutput> {
  let fallbackReason:string|undefined;
  let localFailure:{reason:"timeout"|"http-error"|"invalid-output";status?:number}|undefined;
  if(local.enabled && local.baseUrl && local.apiKey) {
    try {
      let output=await new RenderLlmProvider().generateText({...input,...localInput,model:"sara-qwen-0.5b",baseUrl:local.baseUrl,apiKey:local.apiKey,timeoutMs:Math.min(local.timeoutMs,primary?input.timeoutMs:45000)});
      if(normalizeLocal) output={...output,text:normalizeLocal(output.text)};
      if(validateLocal && !validateLocal(output.text)) throw new Error("validation");
      return output;
    } catch (error) {
      // Do not expose credentials, prompts or upstream response bodies in diagnostics.
      fallbackReason="local_unavailable_or_invalid";
      const details=error instanceof AppError ? error.details as {status?:unknown}|undefined : undefined;
      localFailure=typeof details?.status === "number" ? {reason:"http-error",status:details.status} :
        error instanceof Error && ["TimeoutError","AbortError"].includes(error.name) ? {reason:"timeout"} : {reason:"invalid-output"};
    }
  }
  if (!primary) throw new AppError(localFailure?"LLM_OWN_UNAVAILABLE":"LLM_CLOUD_SUSPENDED",503,"Fallback externo suspenso; classificação por catálogo continua disponível.",localFailure);
  const output=await primary.generateText(input);
  return {...output,provider:primary.name,model:input.model,...(fallbackReason?{fallbackReason}:{})};
}
