import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/env";
import { PredationReasoningService, buildPredationPrompts } from "./llm/predation-reasoning.service";
import { projectPredationScenario } from "./simulation/predation-dynamics.service";
import { getCatalogSpecies } from "./simulation/fauna-definition.service";

const state = () => projectPredationScenario({ natives: [],
  invader: { ...structuredClone(getCatalogSpecies("onca-pintada")!), id: "introduced", populationTarget: 2 },
  habitatCompatible: true, resources: [] });

test("Containment preserves the projection and never instantiates a cloud provider", async () => {
  const before = env.llmCloudEnabled; env.llmCloudEnabled = false;
  try {
    const result = await new PredationReasoningService(() => {throw new Error("cloud must not run");}).explain(state());
    assert.equal(result.source,"rules");
    assert.deepEqual(result.actionIds,state().actions.map(a=>a.id));
    assert.ok(result.warnings[0]?.includes("suspenso"));
  } finally {env.llmCloudEnabled = before;}
});

test("Predation LLM: the complete network, control, limitations and permitted actions reach the prompt", () => {
  const projection = state();
  const prompts = buildPredationPrompts(projection);
  assert.deepEqual(JSON.parse(prompts.userPrompt), projection);
  for (const term of ["não implica devastação", "não alterar", "capacidade de suporte", "instrução"]) assert.ok(prompts.systemPrompt.includes(term));
});

test("Predation LLM: disabled provider returns explicit rules without making an external call", async () => {
  const result = await new PredationReasoningService(() => null).explain(state());
  assert.equal(result.source, "rules");
  assert.deepEqual(result.actionIds, state().actions.map((a) => a.id));
});

for (const mode of ["valid", "fenced-valid", "fenced-overwrite", "invented", "omitted", "duplicate", "malformed", "timeout", "overwrite"]) {
  test(`Predation LLM: ${mode} response cannot change the simulation`, async () => {
    const oldKey = env.llmApiKey;
    env.llmApiKey = "local-mocked-key";
    const projection = state();
    const original = structuredClone(projection);
    const ids = projection.actions.map((a) => a.id);
    const service = new PredationReasoningService(() => ({
      name: "gemini", defaultModel: "mock", defaultBaseUrl: "https://mock.invalid",
      generateText: async (request) => {
        assert.equal(request.responseSchema?.additionalProperties, false);
        assert.deepEqual(request.responseSchema?.required, ["summary", "actionIds"]);
        if (mode === "timeout") throw new Error("timeout");
        if (mode === "malformed") return { text: "not-json" };
        const actionIds = mode === "invented" ? [...ids, "destroy:ecosystem"] : mode === "omitted" ? [] : mode === "duplicate" ? [...ids, ...ids] : ids;
        const text = JSON.stringify({ summary: "Resultado simulado limitado pela alimentação.", actionIds,
          ...(mode.endsWith("overwrite") ? { populations: { introduced: 999999 } } : {}) });
        return { text: mode.startsWith("fenced-") ? `\x60\x60\x60json\n${text}\n\x60\x60\x60` : text };
      },
    }));
    try {
      const result = await service.explain(projection);
      assert.equal(result.source, ["valid", "fenced-valid"].includes(mode) ? "llm" : "rules");
      assert.deepEqual(result.actionIds, ids);
      assert.deepEqual(projection, original);
      if (!["valid", "fenced-valid"].includes(mode)) assert.ok(result.warnings.length > 0);
    } finally { env.llmApiKey = oldKey; }
  });
}
