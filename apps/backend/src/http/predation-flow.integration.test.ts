import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createApp } from "../app";
import { env } from "../config/env";
import { pool } from "../database/postgres";
import type { InvasiveScenarioResult } from "../modules/ecology/simulation/invasive-scenario.service";
import type { EcologicalLlmResult } from "../modules/ecology/llm/ecological-llm.service";
import { syntheticForecastExample, type EcologicalForecastResult } from "@sara/shared-types";
import type { EcosystemReportResult } from "../modules/ecology/ecosystem-report.service";
const database = new URL(env.databaseUrl!);
const localOnly = env.nodeEnv === "test" && database.hostname === "127.0.0.1" && database.pathname === "/sara_test";

test("Production report: the seven tester prompts preserve ecosystem identity through the HTTP report flow", { skip: !localOnly }, async () => {
  await serverTest(async base => {
    for (const [prompt, slug] of [["Floresta amazônica úmida", "amazonia"], ["Cerrado com campos e mata de galeria", "cerrado"], ["Caatinga seca", "caatinga"], ["Manguezal costeiro", "mangue"], ["Pantanal com áreas inundáveis", "pantanal"], ["Oceano polar", "oceano-polar"], ["Caverna", "caverna"]]) {
      const response = await fetch(`${base}/ecology/ecosystem-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({prompt, width:20, height:16, seed:41}) });
      assert.equal(response.status, 200);
      const { data } = await response.json() as {data:EcosystemReportResult};
      assert.equal(data.biomeSlug, slug);
      if (["amazonia", "mangue"].includes(slug!)) assert.ok(!data.report.ecosystemProfile.mismatches.some(m => /grid tem.*água/.test(m)));
      if (slug === "oceano-polar") assert.ok(data.report.climate.temperatureRangeC[1] < 1);
      if (slug === "caverna") {
        assert.ok(data.report.formations.caveCells > 0);
        assert.equal(data.report.ecosystemProfile.profile?.slug, "caverna-tropical");
        assert.ok(data.terrain.cells.flat().every(c => c.biomeSuggestion === "caverna"));
      }
    }
  });
});

// These tests require the disposable DB created by scripts/test-local.mjs.
after(async () => { await pool.end(); });

async function serverTest(run: (base: string) => Promise<void>) {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((done) => server.once("listening", done));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try { await run(`http://127.0.0.1:${address.port}/api/v1`); }
  finally { await new Promise<void>((done) => server.close(() => done())); }
}

test("Full flow: observational forecast validates evidence, returns hindcast metrics and rejects short series", { skip: !localOnly }, async () => {
  await serverTest(async (base) => {
    const input = syntheticForecastExample();
    const send = (payload: unknown) => fetch(`${base}/ecology/forecast`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const response = await send(input);
    assert.equal(response.status, 200);
    const { data } = await response.json() as { data: EcologicalForecastResult };
    assert.equal(data.modelVersion, "observational-log-trend-v1");
    assert.equal(data.species[0]!.forecast.length, 14);
    assert.ok(data.species[0]!.validation.beatsPersistence);
    assert.equal(data.source.kind, "synthetic");
    const invalid = await send({ ...input, observations: input.observations.slice(0, 2) });
    assert.equal(invalid.status, 400);
    const unknown = structuredClone(input);
    unknown.speciesIds = ["especie-inexistente"];
    unknown.observations.forEach(o => { o.populations = { "especie-inexistente": 12 }; });
    const rejected = await send(unknown);
    assert.equal(rejected.status, 422);
    assert.equal((await rejected.json() as {error:{code:string}}).error.code, "FORECAST_SPECIES_UNKNOWN");
  });
});

test("Description routes invasion prompts to the real model and ordinary prompts to ecosystem reports", {skip: !localOnly}, async () => {
  await serverTest(async base => {
    for (const [prompt, kind] of [["Invasão de javalis no Cerrado", "invasive"], ["Leões introduzidos na Antártida", "invasive"], ["Floresta amazônica úmida", "ecosystem"]]) {
      const response = await fetch(`${base}/ecology/simulate-prompt`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt,width:20,height:16,seed:41})});
      assert.equal(response.status,200);
      const {data} = await response.json() as {data:{kind:string;result:InvasiveScenarioResult & EcosystemReportResult}};
      assert.equal(data.kind,kind);
      if (kind === "invasive") {
        assert.equal(data.result.phases.length,4);
        assert.ok(data.result.explanation.text.length > 0);
        assert.ok(data.result.nativeSpecies.length > 0);
        if (prompt!.includes("Antártida")) {
          assert.equal(data.result.invaderProfile.habitatCompatible,false);
          assert.equal(data.result.phases.at(-1)!.invaderPop,0);
        }
      } else assert.equal(data.result.biomeSlug,"amazonia");
    }
    const incomplete = await fetch(`${base}/ecology/simulate-prompt`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"Uma invasão no Cerrado"})});
    assert.equal(incomplete.status,422);
    assert.equal((await incomplete.json() as {error:{code:string}}).error.code,"INVASION_SPECIES_REQUIRED");
  });
});

test("Full flow: API → local PostgreSQL → predation projection → validated response", { skip: !localOnly }, async () => {
  await serverTest(async (base) => {
    for (const [speciesText, locationText] of [["leão", "cerrado"], ["tigre", "floresta amazônica"], ["javali", "cerrado"], ["coelho-europeu", "caatinga"], ["tilápia", "pantanal"], ["leão", "antartida"]]) {
      const response = await fetch(`${base}/ecology/invasive`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ speciesText, locationText, width: 16, height: 12, seed: 41 }),
      });
      assert.equal(response.status, 200, `${speciesText}/${locationText}: ${await response.clone().text()}`);
      const { data } = await response.json() as { data: InvasiveScenarioResult };
      if (locationText !== "antartida") assert.ok(data.nativeSpecies.length > 0, `${speciesText}/${locationText} has no fauna`);
      assert.ok(data.explanation.facts.length > 0, "real database grounding missing");
      assert.equal(data.predationReasoning.source, "rules", "tests must not call a paid/external LLM");
      assert.deepEqual(data.predationReasoning.actionIds, data.predationDynamics.actions.map((a) => a.id));
      if (!data.invaderProfile.survives) assert.ok(data.establishmentPlausibility.score < 50, "establishment score contradicts projected failure");
      const ids = new Set([...data.nativeSpecies.map((s) => s.id), data.invader.id]);
      for (const link of data.predationDynamics.network) { assert.ok(ids.has(link.predatorId)); assert.ok(ids.has(link.preyId)); }
      for (const [index, phase] of data.phases.entries()) {
        assert.equal(phase.invaderPop, data.predationDynamics.snapshots[index]!.populations[data.invader.id]);
        for (const native of data.nativeSpecies) assert.ok(native.populationTarget + phase.nativeDeltas[native.id]! >= 0);
      }
      if (locationText === "antartida") {
        assert.equal(data.invaderProfile.survives, false);
        assert.equal(data.phases.at(-1)!.invaderPop, 0);
        assert.ok(Object.values(data.phases.at(-1)!.nativeDeltas).every((delta) => delta === 0));
      }
    }
  });
});

test("Full flow: repeated input is deterministic and clients cannot inject actions/populations", { skip: !localOnly }, async () => {
  await serverTest(async (base) => {
    const input = { speciesText: "leão", locationText: "cerrado", width: 12, height: 10, seed: 9 };
    const send = async (payload: unknown) => {
      const response = await fetch(`${base}/ecology/invasive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      assert.equal(response.status, 200);
      return (await response.json() as { data: InvasiveScenarioResult }).data;
    };
    const a = await send(input);
    const b = await send({ ...input, predationDynamics: { actions: ["destroy"], populations: { invader: 999999 } } });
    assert.deepEqual(a.predationDynamics, b.predationDynamics);
    assert.deepEqual(a.phases, b.phases);
    const invalid = await fetch(`${base}/ecology/invasive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, width: 1 }) });
    assert.equal(invalid.status, 400);
  });
});

test("Full flow: ecological LLM inspection includes predation rules and sourced DB facts", { skip: !localOnly }, async () => {
  await serverTest(async (base) => {
    const response = await fetch(`${base}/ecology/generate`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Como funciona a predação no cerrado?", ecosystems: ["cerrado"], dryRun: true }) });
    assert.equal(response.status, 200);
    const { data } = await response.json() as { data: EcologicalLlmResult };
    assert.ok(data.factsUsed > 0);
    assert.ok(data.contextPreview.includes("não implica devastação automática"));
    assert.equal(data.answer, null);
  });
});

test("Own model answers grounded questions and explains scenarios over HTTP with cloud disabled",{skip:!localOnly},async()=>{
 const before={...env};const request=globalThis.fetch;const roles:string[]=[];
 Object.assign(env,{llmProvider:"render",llmCloudEnabled:false,renderLlmApiKey:"own-test-key",renderLlmBaseUrl:"https://own.test/v1"});
 globalThis.fetch=(async(input,init)=>{
  if(new URL(String(input)).hostname==="127.0.0.1")return request(input,init);
  assert.equal(String(input),"https://own.test/v1/chat/completions");
  assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer own-test-key");
  const body=JSON.parse(String(init?.body));assert.equal(body.model,"sara-qwen-0.5b");
  const scenario=Boolean(body.response_format);roles.push(scenario?"predation":"question");
  return Response.json({choices:[{message:{content:scenario?JSON.stringify({summary:"Habitat incompatível impede o estabelecimento nesta simulação."}):"Alimento finito e mortalidade limitam o crescimento."},finish_reason:"stop"}]});
 }) as typeof fetch;
 try{
  await serverTest(async base=>{
   const response=await fetch(`${base}/ecology/generate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"Como funciona a predação no cerrado?",ecosystems:["cerrado"]})});
   assert.equal(response.status,200);const {data}=await response.json() as {data:EcologicalLlmResult};
   assert.equal(data.provider,"render");assert.equal(data.model,"sara-qwen-0.5b");assert.ok(data.answer);assert.ok(data.factsUsed<=3);
   const result=await fetch(`${base}/ecology/simulate-prompt`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"Leões introduzidos na Antártida",width:12,height:10,seed:41})});
   assert.equal(result.status,200);const invasion=await result.json() as {data:{result:InvasiveScenarioResult}};
   assert.equal(invasion.data.result.predationReasoning.source,"llm");
   assert.equal(invasion.data.result.predationReasoning.provider,"render");
   assert.equal(invasion.data.result.phases.at(-1)!.invaderPop,0);
  });
  assert.deepEqual(roles,["question","predation"]);
 }finally{Object.assign(env,before);globalThis.fetch=request;}
});

test("Own classification ignores legacy cloud credentials even if the cloud flag is enabled",{skip:!localOnly},async()=>{
 const before={...env};const request=globalThis.fetch;let calls=0;
 Object.assign(env,{llmProvider:"render",llmCloudEnabled:true,renderLlmEnabled:false,
  renderLlmApiKey:"own-test-key",renderLlmBaseUrl:"https://own.test/v1",
  llmApiKey:"cloud-secret",llmBaseUrl:"https://cloud.test"});
 globalThis.fetch=(async(input,init)=>{
  if(new URL(String(input)).hostname==="127.0.0.1")return request(input,init);
  calls++;assert.equal(String(input),"https://own.test/v1/chat/completions");
  assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer own-test-key");
  return new Response("private upstream error",{status:503});
 }) as typeof fetch;
 try{await serverTest(async base=>{
  const response=await fetch(`${base}/ecology/prompt-terrain`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"an unlabelled landscape for own exclusive mode",width:4,height:4,seed:41})});
  assert.equal(response.status,200);const payload=await response.json() as {data:{source:string;inferenceFailure:{status:number}}};
  assert.equal(payload.data.source,"default");assert.equal(payload.data.inferenceFailure.status,503);
 });assert.equal(calls,1);}finally{Object.assign(env,before);globalThis.fetch=request;}
});

test("Quota containment suspends text but preserves live scenarios with zero external calls",{skip:!localOnly},async()=>{
 const before={llmCloudEnabled:env.llmCloudEnabled,llmProvider:env.llmProvider,llmApiKey:env.llmApiKey};
 const request=globalThis.fetch;let externalCalls=0;
 Object.assign(env,{llmCloudEnabled:false,llmProvider:"gemini",llmApiKey:"not-a-real-key"});
 globalThis.fetch=(async(input,init)=>{
  if(new URL(String(input)).hostname!=="127.0.0.1"){externalCalls++;throw new Error("external request forbidden");}
  return request(input,init);
 }) as typeof fetch;
 try {
  await serverTest(async base=>{
   const question=await fetch(`${base}/ecology/generate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"O que limita uma presa sem predadores?",ecosystems:["cerrado"]})});
   assert.equal(question.status,503);
   assert.equal((await question.json() as {error:{code:string}}).error.code,"LLM_CLOUD_SUSPENDED");
   const scenario=await fetch(`${base}/ecology/simulate-prompt`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:"Invasão de javalis no Cerrado",width:20,height:16,seed:41})});
   assert.equal(scenario.status,200);
   const {data}=await scenario.json() as {data:{result:InvasiveScenarioResult}};
   assert.equal(data.result.predationReasoning.source,"rules");
   assert.ok(data.result.phases.length>0);
   assert.ok(data.result.predationReasoning.warnings.some(w=>w.includes("suspenso")));
  });
  assert.equal(externalCalls,0);
 }finally{Object.assign(env,before);globalThis.fetch=request;}
});
