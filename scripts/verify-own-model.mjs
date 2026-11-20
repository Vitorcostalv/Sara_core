import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base=(process.argv[2]??"https://sara-core-one.vercel.app/api/v1").replace(/\/$/,"");
const checks=[];
async function call(path,body){
 const start=Date.now();
 const response=await fetch(base+path,{method:body?"POST":"GET",headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(110000)});
 const payload=await response.json();
 assert.equal(response.status,200,JSON.stringify({path,status:response.status,error:payload.error}));
 return {payload,durationMs:Date.now()-start};
}
try{
 const {payload:health}=await call("/health");
 assert.equal(health.capabilities.cloudLlmEnabled,false);
 assert.equal(health.capabilities.llmRoles.questions,"render");
 assert.equal(health.capabilities.llmRoles.predationExplanation,"render");
 console.log(JSON.stringify({commit:health.deployment.commit,roles:health.capabilities.llmRoles}));
 for(const prompt of [
  "O que limita o crescimento de uma presa sem predadores no Cerrado?",
  "Um predador pode também ser presa? Use um exemplo didático do catálogo.",
  "É inevitável que uma espécie introduzida devaste um ecossistema?",
 ]){
  const {payload:{data},durationMs}=await call("/ecology/generate",{prompt,ecosystems:["cerrado"]});
  assert.equal(data.provider,"render");assert.equal(data.model,"sara-qwen-0.5b");assert.ok(data.answer?.trim());
  assert.equal(data.responseMode,"grounded-extractive");
  if(prompt.startsWith("O que limita"))assert.match(data.answer,/alimento.*mortalidade.*capacidade de suporte/i);
  if(prompt.startsWith("Um predador"))assert.match(data.answer,/→.*→/);
  if(prompt.startsWith("É inevitável"))assert.match(data.answer,/não.*(devasta|implica)/i);
  const check={kind:"question",prompt,durationMs,provider:data.provider,model:data.model,answer:data.answer,groundingCoverage:data.groundingCoverage,contextPreview:data.contextPreview};
  checks.push(check);console.log(JSON.stringify(check));
 }
 for(const prompt of ["Leões introduzidos na Antártida","Invasão de coelhos na Caatinga","Simule uma invasão de leões no Cerrado"]){
  const {payload:{data},durationMs}=await call("/ecology/simulate-prompt",{prompt,width:20,height:16,seed:41});
  assert.equal(data.kind,"invasive");const result=data.result,reasoning=result.predationReasoning;
  assert.equal(reasoning.source,"llm",JSON.stringify(reasoning));assert.equal(reasoning.provider,"render");
  assert.equal(reasoning.model,"sara-qwen-0.5b");
  assert.equal(reasoning.responseMode,"grounded-extractive");
  const populations=result.phases.map(p=>p.invaderPop);
  assert.ok(populations.every(p=>Number.isFinite(p)&&p>=0&&p<=100));
  if(prompt.includes("Antártida"))assert.equal(populations.at(-1),0);
  const check={kind:"scenario",prompt,durationMs,populations,reasoning,outcome:result.predationDynamics.outcome};
  checks.push(check);console.log(JSON.stringify(check));
 }
 console.log("Inferência própria confirmada nos dois fluxos. O conteúdo ainda exige revisão de coerência com o contexto; status 200 não certifica precisão científica.");
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await mkdir(".tmp/verification",{recursive:true});await writeFile(".tmp/verification/own-model-production.json",JSON.stringify({base,checks},null,2));}
