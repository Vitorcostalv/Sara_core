import type { GroundingCategory } from "../ecology.schemas";
import type { GroundingFactRow } from "./ecological-grounding.repository";

// ─── Query classification ────────────────────────────────────────────────────

export type EcologicalQueryType =
  | "factual"
  | "comparative"
  | "causal"
  | "restoration"
  | "modeling"
  | "speculative"
  | "artificial-project";

const comparativePatterns = /\b(compar|diferent|versus|vs\.?|melhor|pior|qual a diferença)/i;
const causalPatterns = /\b(por que|o que causa|razão|motivo|resulta|consequência|efeito)/i;
const restorationPatterns = /\b(restaur|recuper|reveget|reabilit|revitaliz)/i;
const modelingPatterns = /\b(model|simul|algorit|procedur|generat|computacion|digital twin|IA\b|LLM\b|ABM\b)/i;
const speculativePatterns = /\b(e se\b|se ocorrer|hipotét|hipotet|poderia|teria|numa situação)/i;
const artificialPatterns = /\b(artificial|construída|construido|wetland|agroflorest|recife artificial|biosfera|permacult|sintrop|urban)/i;

export function classifyEcologicalQuery(prompt: string): EcologicalQueryType {
  if (speculativePatterns.test(prompt)) return "speculative";
  if (modelingPatterns.test(prompt)) return "modeling";
  if (restorationPatterns.test(prompt)) return "restoration";
  if (artificialPatterns.test(prompt)) return "artificial-project";
  if (comparativePatterns.test(prompt)) return "comparative";
  if (causalPatterns.test(prompt)) return "causal";
  return "factual";
}

// ─── Category recommendations by query type ──────────────────────────────────

const categoryMapByQueryType: Record<EcologicalQueryType, GroundingCategory[]> = {
  factual: ["ecosystem", "concept", "abiotic-factor", "species"],
  comparative: ["ecosystem", "concept", "abiotic-factor"],
  causal: ["ecosystem", "concept", "formation-process", "abiotic-factor"],
  restoration: ["artificial-project", "concept", "ecosystem", "abiotic-factor"],
  modeling: ["modeling-approach", "concept", "reference"],
  speculative: ["concept", "ecosystem", "modeling-approach"],
  "artificial-project": ["artificial-project", "concept", "abiotic-factor", "ecosystem"],
};

export function recommendedCategories(queryType: EcologicalQueryType): GroundingCategory[] {
  return categoryMapByQueryType[queryType];
}

// ─── Coverage validation ──────────────────────────────────────────────────────

export interface CoverageReport {
  sufficient: boolean;
  warnings: string[];
  safeMessage: string | null;
}

const MIN_FACTS_FOR_GROUNDING = 2;
const MIN_FACTS_SPECULATIVE = 1;

export function validateCoverage(
  facts: GroundingFactRow[],
  queryType: EcologicalQueryType,
  requestedEcosystems: string[]
): CoverageReport {
  const warnings: string[] = [];
  const activeFacts = facts.filter((f) => f.is_active);

  const minRequired = queryType === "speculative" ? MIN_FACTS_SPECULATIVE : MIN_FACTS_FOR_GROUNDING;

  if (activeFacts.length === 0) {
    return {
      sufficient: false,
      warnings: ["Nenhum fato ativo encontrado no domínio ambiental para este contexto."],
      safeMessage:
        "Não encontrei informação suficiente no banco para responder com segurança sobre esse tema ecológico.",
    };
  }

  if (activeFacts.length < minRequired) {
    warnings.push(
      `Cobertura baixa: apenas ${activeFacts.length} fato(s) ativo(s) encontrado(s) (mínimo recomendado: ${minRequired}).`
    );
  }

  // Verify requested ecosystems are covered
  const coveredEcosystemSlugs = new Set<string>();
  activeFacts.forEach((f) => {
    if (f.category === "ecosystem" && f.entity_table === "ecosystems") {
      coveredEcosystemSlugs.add(f.slug);
    }
  });

  requestedEcosystems.forEach((slug) => {
    if (!coveredEcosystemSlugs.has(slug)) {
      warnings.push(`Ecossistema requisitado '${slug}' não possui fatos no banco.`);
    }
  });

  // Source verification
  const factsWithoutSource = activeFacts.filter((f) => !f.source_id || !f.citation_key);
  if (factsWithoutSource.length > 0) {
    warnings.push(
      `${factsWithoutSource.length} fato(s) ignorado(s) por ausência de fonte ou citation_key.`
    );
  }

  // Speculative disclaimer
  if (queryType === "speculative") {
    warnings.push(
      "Pergunta especulativa detectada. A resposta usará fatos do banco mas pode não ter cobertura científica plena."
    );
  }

  // Modeling disclaimer
  if (queryType === "modeling") {
    warnings.push(
      "Pergunta sobre modelagem/IA detectada. Resposta grounded em abordagens de modeling-approach do banco."
    );
  }

  const sufficient = activeFacts.filter((f) => f.source_id && f.citation_key).length >= minRequired;

  return {
    sufficient,
    warnings,
    safeMessage: sufficient
      ? null
      : "Não encontrei informação suficiente no banco para responder com segurança.",
  };
}

// ─── Fact quality filter ──────────────────────────────────────────────────────

export function filterValidFacts(facts: GroundingFactRow[]): GroundingFactRow[] {
  return facts.filter(
    (f) =>
      f.is_active &&
      f.source_id !== null &&
      f.citation_key !== null &&
      f.fact_text.trim().length > 0 &&
      f.domain_id === "domain-environmental-ecology"
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export function rankFacts(
  facts: GroundingFactRow[],
  requestedEcosystems: string[]
): GroundingFactRow[] {
  const requestedSet = new Set(requestedEcosystems);

  return [...facts].sort((a, b) => {
    // 1. Requested ecosystem facts first
    const aRequested = requestedSet.has(a.slug) ? 0 : 1;
    const bRequested = requestedSet.has(b.slug) ? 0 : 1;
    if (aRequested !== bRequested) return aRequested - bRequested;

    // 2. Ecosystem facts over other categories
    const aIsEco = a.category === "ecosystem" ? 0 : 1;
    const bIsEco = b.category === "ecosystem" ? 0 : 1;
    if (aIsEco !== bIsEco) return aIsEco - bIsEco;

    // 3. Importance descending (5 = highest)
    if (b.importance !== a.importance) return b.importance - a.importance;

    // 4. Prefer facts with source year (more specific citation)
    const aHasYear = a.source_year ? 0 : 1;
    const bHasYear = b.source_year ? 0 : 1;
    if (aHasYear !== bHasYear) return aHasYear - bHasYear;

    return 0;
  });
}

// ─── Category whitelist enforcement ──────────────────────────────────────────

const ALLOWED_CATEGORIES = new Set<GroundingCategory>([
  "concept",
  "ecosystem",
  "formation-process",
  "abiotic-factor",
  "species",
  "artificial-project",
  "modeling-approach",
  "reference",
]);

export function isAllowedCategory(category: string): category is GroundingCategory {
  return ALLOWED_CATEGORIES.has(category as GroundingCategory);
}

export function filterByAllowedCategories(
  facts: GroundingFactRow[],
  categories: GroundingCategory[]
): GroundingFactRow[] {
  const allowed = categories.length > 0 ? new Set(categories) : ALLOWED_CATEGORIES;
  return facts.filter((f) => allowed.has(f.category as GroundingCategory));
}

// ─── Ambiguous term detection ─────────────────────────────────────────────────

const AMBIGUOUS_TERMS: Record<string, string> = {
  raça: "Termo ambíguo em ecologia. Use 'subspecies', 'ecotype', 'cultivar' ou 'breed' conforme contexto taxonômico.",
  raca: "Termo ambíguo em ecologia. Use 'subespécie', 'ecótipo' ou 'variedade' conforme contexto taxonômico.",
  espécie: "Confirme se a pergunta é sobre classificação taxonômica, conservação ou papel ecológico da espécie.",
};

export function detectAmbiguousTerms(prompt: string): string[] {
  const normalized = prompt.toLowerCase();
  const warnings: string[] = [];
  Object.entries(AMBIGUOUS_TERMS).forEach(([term, note]) => {
    if (normalized.includes(term)) warnings.push(note);
  });
  return warnings;
}
