import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createApp } from "../app";
import { env } from "../config/env";
import { pool } from "../database/postgres";
import type { InvasiveScenarioResult } from "../modules/ecology/simulation/invasive-scenario.service";
import type { EcologicalLlmResult } from "../modules/ecology/llm/ecological-llm.service";
import { syntheticForecastExample, type EcologicalForecastResult } from "@sara/shared-types";

// These tests require the disposable DB created by scripts/test-local.mjs.
const database = new URL(env.databaseUrl!);
const localOnly = env.nodeEnv === "test" && database.hostname === "127.0.0.1" && database.pathname === "/sara_test";
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
