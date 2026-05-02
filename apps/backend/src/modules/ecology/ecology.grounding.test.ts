import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyEcologicalQuery,
  detectAmbiguousTerms,
  filterByAllowedCategories,
  filterValidFacts,
  rankFacts,
  recommendedCategories,
  validateCoverage,
} from "./grounding/ecological-business-rules.service";
import type { GroundingFactRow } from "./grounding/ecological-grounding.repository";

function makeGroundingFact(overrides: Partial<GroundingFactRow> = {}): GroundingFactRow {
  return {
    id: "gfact-test-001",
    domain_id: "domain-environmental-ecology",
    category: "ecosystem",
    slug: "cerrado",
    title: "Cerrado",
    fact_text: "O cerrado é uma savana neotropical com alta diversidade.",
    language: "pt-BR",
    importance: 4,
    entity_table: "ecosystems",
    entity_id: "ecosystem-cerrado",
    source_id: "src-sara-part1",
    citation_key: "SARA-PART1-2026",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_title: "Sara Core Foundation",
    source_type: "internal_document",
    source_year: 2026,
    ...overrides,
  };
}

// ─── Query classification ─────────────────────────────────────────────────────

test("Ecology business rules: classifies factual query correctly", () => {
  assert.equal(classifyEcologicalQuery("O que é um ecossistema?"), "factual");
  assert.equal(classifyEcologicalQuery("Descreva a caatinga."), "factual");
});

test("Ecology business rules: classifies comparative query", () => {
  assert.equal(classifyEcologicalQuery("Compare o cerrado com a caatinga."), "comparative");
  assert.equal(classifyEcologicalQuery("Qual a diferença entre floresta tropical e savana?"), "comparative");
});

test("Ecology business rules: classifies causal query", () => {
  assert.equal(classifyEcologicalQuery("Por que o manguezal tem alta produtividade?"), "causal");
  assert.equal(classifyEcologicalQuery("O que causa o branqueamento de corais?"), "causal");
});

test("Ecology business rules: classifies restoration query", () => {
  assert.equal(classifyEcologicalQuery("Como restaurar um recife de coral degradado?"), "restoration");
  assert.equal(classifyEcologicalQuery("Reabilitação de zonas úmidas ripárias."), "restoration");
});

test("Ecology business rules: classifies modeling query", () => {
  assert.equal(classifyEcologicalQuery("Como modelar a distribuição de espécies com ABM?"), "modeling");
  assert.equal(classifyEcologicalQuery("Usar IA para simular um ecossistema."), "modeling");
});

test("Ecology business rules: classifies speculative query", () => {
  assert.equal(classifyEcologicalQuery("E se a temperatura subir 4°C no Pantanal?"), "speculative");
  assert.equal(classifyEcologicalQuery("Hipotéticamente, o que aconteceria se o Cerrado fosse inundado?"), "speculative");
});

test("Ecology business rules: classifies artificial project query", () => {
  assert.equal(classifyEcologicalQuery("Como projetar uma wetland construída para tratamento?"), "artificial-project");
  assert.equal(classifyEcologicalQuery("Agrofloresta multiestrato com espécies nativas."), "artificial-project");
});

// ─── Recommended categories ───────────────────────────────────────────────────

test("Ecology business rules: recommends ecosystem+concept for factual query", () => {
  const cats = recommendedCategories("factual");
  assert.ok(cats.includes("ecosystem"), "should include ecosystem");
  assert.ok(cats.includes("concept"), "should include concept");
});

test("Ecology business rules: recommends modeling-approach for modeling query", () => {
  const cats = recommendedCategories("modeling");
  assert.ok(cats.includes("modeling-approach"), "should include modeling-approach");
});

test("Ecology business rules: recommends artificial-project for artificial query", () => {
  const cats = recommendedCategories("artificial-project");
  assert.ok(cats.includes("artificial-project"), "should include artificial-project");
});

// ─── Quality filter ───────────────────────────────────────────────────────────

test("Ecology business rules: accepts valid grounding fact", () => {
  const fact = makeGroundingFact();
  const result = filterValidFacts([fact]);
  assert.equal(result.length, 1);
});

test("Ecology business rules: rejects fact without source_id", () => {
  const fact = makeGroundingFact({ source_id: null });
  assert.equal(filterValidFacts([fact]).length, 0);
});

test("Ecology business rules: rejects fact without citation_key", () => {
  const fact = makeGroundingFact({ citation_key: null });
  assert.equal(filterValidFacts([fact]).length, 0);
});

test("Ecology business rules: rejects inactive fact", () => {
  const fact = makeGroundingFact({ is_active: false });
  assert.equal(filterValidFacts([fact]).length, 0);
});

test("Ecology business rules: rejects fact from wrong domain", () => {
  const fact = makeGroundingFact({ domain_id: "domain-other" });
  assert.equal(filterValidFacts([fact]).length, 0);
});

test("Ecology business rules: rejects fact with empty text", () => {
  const fact = makeGroundingFact({ fact_text: "   " });
  assert.equal(filterValidFacts([fact]).length, 0);
});

// ─── Category whitelist ───────────────────────────────────────────────────────

test("Ecology business rules: accepts facts in allowed categories", () => {
  const facts = [
    makeGroundingFact({ category: "ecosystem" }),
    makeGroundingFact({ id: "gfact-002", category: "concept" }),
    makeGroundingFact({ id: "gfact-003", category: "abiotic-factor" }),
  ];
  const result = filterByAllowedCategories(facts, ["ecosystem", "concept"]);
  assert.equal(result.length, 2);
});

test("Ecology business rules: rejects facts not in requested categories", () => {
  const facts = [
    makeGroundingFact({ category: "species" }),
    makeGroundingFact({ id: "gfact-002", category: "concept" }),
  ];
  const result = filterByAllowedCategories(facts, ["ecosystem"]);
  assert.equal(result.length, 0);
});

test("Ecology business rules: accepts all valid categories when none specified", () => {
  const facts = [
    makeGroundingFact({ category: "ecosystem" }),
    makeGroundingFact({ id: "gfact-002", category: "species" }),
    makeGroundingFact({ id: "gfact-003", category: "modeling-approach" }),
  ];
  const result = filterByAllowedCategories(facts, []);
  assert.equal(result.length, 3);
});

// ─── Ranking ──────────────────────────────────────────────────────────────────

test("Ecology business rules: ranks requested ecosystem facts first", () => {
  const eco = makeGroundingFact({ id: "gfact-eco", category: "ecosystem", slug: "cerrado", importance: 3 });
  const concept = makeGroundingFact({ id: "gfact-concept", category: "concept", slug: "nicho-ecologico", importance: 5 });
  const ranked = rankFacts([concept, eco], ["cerrado"]);
  assert.equal(ranked[0]!.slug, "cerrado", "requested ecosystem should rank first");
});

test("Ecology business rules: ranks higher importance first when no ecosystem preference", () => {
  const low = makeGroundingFact({ id: "gfact-low", importance: 2 });
  const high = makeGroundingFact({ id: "gfact-high", importance: 5 });
  const ranked = rankFacts([low, high], []);
  assert.equal(ranked[0]!.importance, 5);
});

// ─── Coverage validation ──────────────────────────────────────────────────────

test("Ecology business rules: coverage is sufficient with enough valid facts", () => {
  const facts = [
    makeGroundingFact({ id: "f1" }),
    makeGroundingFact({ id: "f2", category: "concept", slug: "ecossistema", entity_table: null, entity_id: null }),
  ];
  const result = validateCoverage(facts, "factual", []);
  assert.equal(result.sufficient, true);
  assert.equal(result.safeMessage, null);
});

test("Ecology business rules: coverage insufficient with no active facts", () => {
  const result = validateCoverage([], "factual", []);
  assert.equal(result.sufficient, false);
  assert.ok(result.safeMessage !== null, "should have a safe message");
});

test("Ecology business rules: warns about missing requested ecosystem", () => {
  const facts = [makeGroundingFact({ slug: "cerrado" })];
  const result = validateCoverage(facts, "factual", ["pantanal"]);
  assert.ok(result.warnings.some((w) => w.includes("pantanal")), "should warn about missing pantanal");
});

test("Ecology business rules: speculative query adds disclaimer warning", () => {
  const facts = [makeGroundingFact({ id: "f1" })];
  const result = validateCoverage(facts, "speculative", []);
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes("especulat")));
});

// ─── Ambiguous terms ──────────────────────────────────────────────────────────

test("Ecology business rules: detects ambiguous term 'raça'", () => {
  const warnings = detectAmbiguousTerms("Qual é a raça de peixe mais comum no Pantanal?");
  assert.ok(warnings.length > 0, "should detect ambiguous term");
  assert.ok(warnings[0]!.toLowerCase().includes("ambíguo"));
});

test("Ecology business rules: no warnings for clean ecological query", () => {
  const warnings = detectAmbiguousTerms("Como funciona a ciclagem de nutrientes em florestas tropicais?");
  assert.equal(warnings.length, 0);
});
