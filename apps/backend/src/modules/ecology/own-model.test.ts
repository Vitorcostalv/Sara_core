import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/env";
import { textLlmRuntime } from "../llm/text-runtime";
import { PredationReasoningService } from "./llm/predation-reasoning.service";
import { buildOwnPredationPrompts, buildOwnQuestionPrompts } from "./llm/own-model-prompts";
import { projectPredationScenario } from "./simulation/predation-dynamics.service";
import { getCatalogSpecies } from "./simulation/fauna-definition.service";
import type { EcologicalBuiltContext } from "./grounding/ecological-context-builder.service";

const projection = () => projectPredationScenario({natives: [],
  invader: {...structuredClone(getCatalogSpecies("onca-pintada")!), id:"introduced", populationTarget:2},
  habitatCompatible:false, resources:[]});

test("Own text runtime never reuses a Gemini model, URL or credential", () => {
  const before = {...env};
  try {
    Object.assign(env, {llmProvider:"render", llmCloudEnabled:false,
      llmModel:"gemini-2.5-flash", llmApiKey:"cloud-secret", llmBaseUrl:"https://cloud.invalid",
      renderLlmApiKey:"own-secret", renderLlmBaseUrl:"https://own.invalid/v1"});
    const runtime = textLlmRuntime();
    assert.equal(runtime.provider?.name,"render");
    assert.equal(runtime.model,"sara-qwen-0.5b");
    assert.equal(runtime.apiKey,"own-secret");
    assert.equal(runtime.baseUrl,"https://own.invalid/v1");
    assert.equal(runtime.permitted,true);
  } finally { Object.assign(env,before); }
});

for (const mode of ["valid", "overwrite", "invalid", "unavailable", "truncated"]) {
  test(`Own predation ${mode}: immutable projection and no cloud fallback`,async()=>{
    const before={...env}; const request=globalThis.fetch; let calls=0;
    Object.assign(env,{llmProvider:"render",llmCloudEnabled:false,
      renderLlmApiKey:"own-secret",renderLlmBaseUrl:"https://own.invalid/v1"});
    globalThis.fetch=(async(url,init)=>{
      calls++; assert.equal(String(url),"https://own.invalid/v1/chat/completions");
      assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer own-secret");
      const payload=JSON.parse(String(init?.body));
      assert.ok(payload.messages[1].content.length<2300);
      if(mode==="unavailable") return new Response("private upstream error",{status:503});
      const content=mode==="invalid" ? "bad JSON" : JSON.stringify({summary:"O habitat incompatível limita o estabelecimento nesta simulação.",
        ...(mode==="overwrite"?{populations:{introduced:9999}}:{})});
      return Response.json({choices:[{message:{content},finish_reason:mode==="truncated"?"length":"stop"}]});
    }) as typeof fetch;
    try {
      const state=projection(), original=structuredClone(state);
      const result=await new PredationReasoningService().explain(state);
      assert.equal(result.source,mode==="valid"?"llm":"rules");
      if(mode==="valid") {assert.equal(result.provider,"render");assert.equal(result.model,"sara-qwen-0.5b");}
      assert.equal(calls,1);assert.deepEqual(state,original);
      assert.deepEqual(result.actionIds,state.actions.map(a=>a.id));
    }finally{Object.assign(env,before);globalThis.fetch=request;}
  });
}

test("Own prompts fit the small context and keep causal limitations without full snapshots",()=>{
  const state=projection();
  const prompts=buildOwnPredationPrompts(state);
  const data=JSON.parse(prompts.userPrompt);
  assert.equal(data.outcome,"failed-establishment");
  assert.deepEqual(data.introducedPopulation,[2,0]);
  assert.ok(data.causes.some((s:string)=>s.includes("Habitat incompatível")));
  assert.ok(!("snapshots" in data));
  assert.ok(prompts.systemPrompt.includes("não prova"));
  const context={facts:Array.from({length:70},()=>({valuePreview:"a".repeat(400),sourceCitationKey:"source"}))} as EcologicalBuiltContext;
  const q=buildOwnQuestionPrompts("Como funciona o ecossistema?",context);
  assert.equal(JSON.parse(q.userPrompt).facts.length,3);
  assert.ok(q.userPrompt.length+q.systemPrompt.length<2100);
  assert.throws(()=>buildOwnQuestionPrompts("a".repeat(601),context),/600 caracteres/);
});
