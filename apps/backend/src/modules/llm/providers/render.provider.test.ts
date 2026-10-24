import assert from "node:assert/strict";
import test from "node:test";
import { RenderLlmProvider } from "./render.provider";
import { generateWithLocalFallback } from "../local-fallback";
import type { LlmProvider, LlmGenerateTextInput } from "../llm.provider";

const input:LlmGenerateTextInput={systemPrompt:"Use grounded facts",userPrompt:"Amazônia",apiKey:"cloud-test",baseUrl:"https://cloud.test",model:"cloud-model",timeoutMs:1000,responseSchema:{type:"object"}};
const local={enabled:true,baseUrl:"https://local.test/v1",apiKey:"local-test",timeoutMs:500};
test("local inference uses server authentication, structured output and bounded tokens",async()=>{
 const before=globalThis.fetch;let payload:any;
 globalThis.fetch=(async(url,init)=>{
   assert.equal(String(url),"https://local.test/v1/chat/completions");
   assert.equal((init!.headers as any).Authorization,"Bearer local-test");
   assert.equal(init!.redirect,"error");payload=JSON.parse(String(init!.body));
   return Response.json({choices:[{message:{content:'{"biomeSlug":"cerrado"}'},finish_reason:"stop"}]});
 }) as typeof fetch;
 try {
   const result=await new RenderLlmProvider().generateText({...input,baseUrl:local.baseUrl,apiKey:local.apiKey});
   assert.equal(result.provider,"render");assert.equal(payload.max_tokens,128);
   assert.equal(payload.response_format.type,"json_schema");assert.equal(payload.stream,false);
 }finally{globalThis.fetch=before;}
});
for(const scenario of ["http","empty","truncated","invalid","timeout"]) test(`local ${scenario} falls back exactly once without reusing the local credential`,async()=>{
 const before=globalThis.fetch;let primaryCalls=0;
 const primary:LlmProvider={name:"gemini",defaultModel:"cloud-model",defaultBaseUrl:"https://cloud.test",async generateText(request){primaryCalls++;assert.equal(request.apiKey,"cloud-test");return {text:"cloud answer"};}};
 globalThis.fetch=(async()=>{
   if(scenario==="timeout") throw new DOMException("timeout","TimeoutError");
   if(scenario==="http") return new Response("private upstream message",{status:503});
   return Response.json({choices:[{message:{content:scenario==="empty"?"":"local answer"},finish_reason:scenario==="truncated"?"length":"stop"}]});
 }) as typeof fetch;
 try {
   const result=await generateWithLocalFallback(primary,input,local,()=>false);
   assert.equal(result.text,"cloud answer");assert.equal(result.provider,"gemini");
   assert.equal(result.fallbackReason,"local_unavailable_or_invalid");assert.equal(primaryCalls,1);
 }finally{globalThis.fetch=before;}
});
test("valid local output skips the cloud provider",async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=(async()=>Response.json({choices:[{message:{content:"valid"},finish_reason:"stop"}]})) as typeof fetch;
 const primary:LlmProvider={name:"gemini",defaultModel:"x",defaultBaseUrl:"x",async generateText(){throw new Error("cloud must not run");}};
 try{assert.equal((await generateWithLocalFallback(primary,input,local,text=>text==="valid")).provider,"render");}finally{globalThis.fetch=before;}
});
test("disabled local mode leaves existing cloud behavior unchanged",async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=(async()=>{throw new Error("local must not run");}) as typeof fetch;
 const primary:LlmProvider={name:"gemini",defaultModel:"x",defaultBaseUrl:"x",async generateText(){return {text:"existing"};}};
 try{assert.equal((await generateWithLocalFallback(primary,input,{...local,enabled:false})).text,"existing");}finally{globalThis.fetch=before;}
});

test("the compact classifier uses the real catalog and rejects invented biomes",async()=>{
 const {localClassifierRequest,normalizeLocalClassification}=await import("../../ecology/llm/terrain-local-classifier");
 const request=localClassifierRequest();
 assert.ok(request.responseSchema.properties.biomeSlug.enum.includes("amazonia"));
 assert.ok(!request.responseSchema.properties.biomeSlug.enum.includes("inventado"));
 assert.equal(request.maxOutputTokens,48);
 const result=JSON.parse(normalizeLocalClassification('{"biomeSlug":"amazonia","interpretation":"invented facts"}'));
 assert.equal(result.displayName,"Amazônia");assert.ok(!result.interpretation.includes("invented facts"));
 assert.throws(()=>normalizeLocalClassification('{"biomeSlug":"inventado"}'));
 assert.throws(()=>normalizeLocalClassification('{"biomeSlug":42}'));
});

test("known ecological terms reject a wrong but syntactically valid local label",async()=>{
 const {normalizeLocalClassification}=await import("../../ecology/llm/terrain-local-classifier");
 assert.throws(()=>normalizeLocalClassification('{"biomeSlug":"oceano"}',"Planície ártica sem árvores, solo com permafrost."));
 assert.throws(()=>normalizeLocalClassification('{"biomeSlug":"pampa"}',"Pantanal brasileiro, uma planície inundável."));
 assert.equal(JSON.parse(normalizeLocalClassification('{"biomeSlug":"tundra"}',"Planície com permafrost.")).biomeSlug,"tundra");
});
