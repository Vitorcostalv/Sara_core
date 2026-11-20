import assert from "node:assert/strict";
import test from "node:test";
import { resolveSimulationIntent } from "./prompt-simulation.service";

for (const [prompt, species, location] of [
  ["Simule uma invasão de javalis no Cerrado", "Javali", "cerrado"],
  ["Leões introduzidos na Antártida", "Leão", "antartida"],
  ["Javali invasor no cerrado brasileiro com fauna nativa afetada.", "Javali", "cerrado"],
  ["Invazão de coelhos na Caatinga", "Coelho-europeu", "caatinga"],
  ["Introduza peixe-leão no oceano", "Peixe-leão", "oceano"],
]) test(`Prompt invasion: ${prompt}`, () => {
  const intent = resolveSimulationIntent(prompt!);
  assert.equal(intent.kind, "invasive");
  if (intent.kind === "invasive") { assert.equal(intent.speciesText, species); assert.equal(intent.locationSlug, location); }
});

for (const prompt of ["Floresta amazônica úmida", "Cerrado com capivaras e onças", "Cerrado sem espécies invasoras", "Pantanal sem invasão"]) {
  test(`Ordinary environment remains an ecosystem: ${prompt}`, () => assert.equal(resolveSimulationIntent(prompt).kind, "ecosystem"));
}
for (const prompt of ["Uma invasão no Cerrado", "Introduza um dragão no Cerrado", "Invasão de javalis", "Invasão de leões e javalis no Cerrado"]) {
  test(`Incomplete or ambiguous invasion is rejected: ${prompt}`, () => assert.throws(() => resolveSimulationIntent(prompt), /Informe|Descreva/));
}
