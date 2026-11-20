import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/env";
import { ecologicalTerrainPromptService } from "./llm/ecological-terrain-prompt.service";

test("Render classifies an unlabelled description while the configured Gemini provider is suspended",async()=>{
 const before={llmCloudEnabled:env.llmCloudEnabled,llmProvider:env.llmProvider,llmApiKey:env.llmApiKey,renderLlmEnabled:env.renderLlmEnabled,renderLlmBaseUrl:env.renderLlmBaseUrl,renderLlmApiKey:env.renderLlmApiKey};
 const request=globalThis.fetch;let calls=0;
 Object.assign(env,{llmCloudEnabled:false,llmProvider:"gemini",llmApiKey:"cloud-must-not-leave",renderLlmEnabled:true,renderLlmBaseUrl:"https://own-model.invalid/v1",renderLlmApiKey:"own-only"});
 globalThis.fetch=(async(url,init)=>{
  calls++;assert.equal(String(url),"https://own-model.invalid/v1/chat/completions");
  assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer own-only");
  assert.ok(!String(init?.body).includes("cloud-must-not-leave"));
  return Response.json({choices:[{message:{content:'{"biomeSlug":"cerrado"}'},finish_reason:"stop"}]});
 }) as typeof fetch;
 try {
  const result=await ecologicalTerrainPromptService.generate({prompt:"Short trees scattered over yellow grasses with a pronounced dry season",width:4,height:4,seed:41});
  assert.equal(result.biomeSlug,"cerrado");assert.equal(result.inference?.provider,"render");assert.equal(calls,1);
 } finally {globalThis.fetch=request;Object.assign(env,before);}
});
