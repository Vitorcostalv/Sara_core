import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../../config/env";
import { PredationReasoningService, buildPredationPrompts } from "./llm/predation-reasoning.service";
import { projectPredationScenario } from "./simulation/predation-dynamics.service";
import { getCatalogSpecies } from "./simulation/fauna-definition.service";

const state = () => projectPredationScenario({ natives: [],
  invader: { ...structuredClone(getCatalogSpecies("onca-pintada")!), id: "introduced", populationTarget: 2 },
  habitatCompatible: true, resources: [] });

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

for (const mode of ["valid", "invented", "omitted", "duplicate", "malformed", "timeout", "overwrite"]) {
  test(`Predation LLM: ${mode} response cannot change the simulation`, async () => {
    const oldKey = env.llmApiKey;
    env.llmApiKey = "local-mocked-key";
    const projection = state();
    const original = structuredClone(projection);
    const ids = projection.actions.map((a) => a.id);
    const service = new PredationReasoningService(() => ({
      name: "gemini", defaultModel: "mock", defaultBaseUrl: "https://mock.invalid",
      generateText: async () => {
        if (mode === "timeout") throw new Error("timeout");
        if (mode === "malformed") return { text: "not-json" };
        const actionIds = mode === "invented" ? [...ids, "destroy:ecosystem"] : mode === "omitted" ? [] : mode === "duplicate" ? [...ids, ...ids] : ids;
        return { text: JSON.stringify({ summary: "Resultado simulado limitado pela alimentação.", actionIds,
          ...(mode === "overwrite" ? { populations: { introduced: 999999 } } : {}) }) };
      },
    }));
    try {
      const result = await service.explain(projection);
      assert.equal(result.source, mode === "valid" ? "llm" : "rules");
      assert.deepEqual(result.actionIds, ids);
      assert.deepEqual(projection, original);
      if (mode !== "valid") assert.ok(result.warnings.length > 0);
    } finally { env.llmApiKey = oldKey; }
  });
}
