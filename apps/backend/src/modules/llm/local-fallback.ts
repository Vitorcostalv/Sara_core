import type { LlmGenerateTextInput, LlmGenerateTextOutput, LlmProvider } from "./llm.provider";
import { RenderLlmProvider } from "./providers/render.provider";

export interface LocalConfig {enabled:boolean;baseUrl:string|null;apiKey:string|null;timeoutMs:number}
/** A failed/cold local instance never disables the existing cloud provider. */
export async function generateWithLocalFallback(primary:LlmProvider,input:LlmGenerateTextInput,local:LocalConfig,
  validateLocal?:(text:string)=>boolean,
  localInput?:Partial<Pick<LlmGenerateTextInput,"systemPrompt"|"responseSchema"|"maxOutputTokens">>,
  normalizeLocal?:(text:string)=>string):Promise<LlmGenerateTextOutput> {
  let fallbackReason:string|undefined;
  if(local.enabled && local.baseUrl && local.apiKey) {
    try {
      let output=await new RenderLlmProvider().generateText({...input,...localInput,model:"sara-qwen-0.5b",baseUrl:local.baseUrl,apiKey:local.apiKey,timeoutMs:Math.min(local.timeoutMs,input.timeoutMs)});
      if(normalizeLocal) output={...output,text:normalizeLocal(output.text)};
      if(validateLocal && !validateLocal(output.text)) throw new Error("validation");
      return output;
    } catch {
      // Do not expose credentials, prompts or upstream response bodies in diagnostics.
      fallbackReason="local_unavailable_or_invalid";
    }
  }
  const output=await primary.generateText(input);
  return {...output,provider:primary.name,model:input.model,...(fallbackReason?{fallbackReason}:{})};
}
