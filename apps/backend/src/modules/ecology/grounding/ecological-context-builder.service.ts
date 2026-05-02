import { logger } from "../../../logging/logger";
import type { GroundingCategory } from "../ecology.schemas";
import {
  classifyEcologicalQuery,
  detectAmbiguousTerms,
  filterByAllowedCategories,
  filterValidFacts,
  rankFacts,
  recommendedCategories,
  validateCoverage,
  type EcologicalQueryType,
  type CoverageReport,
} from "./ecological-business-rules.service";
import {
  ecologicalGroundingRepository,
  type GroundingFactRow,
} from "./ecological-grounding.repository";

const contextLogger = logger.child({ module: "ecological-context-builder" });

const MAX_FACT_TEXT_LENGTH = 400;

export interface EcologicalGroundingFactPreview {
  id: string;
  category: string;
  slug: string;
  title: string;
  valuePreview: string;
  importance: number;
  sourceCitationKey: string | null;
  sourceYear: number | null;
}

export interface EcologicalInspectionSnapshot {
  domainUsed: string;
  categoriesAccepted: string[];
  requestedEcosystems: string[];
  queryType: EcologicalQueryType;
  rawFactsScanned: number;
  factsAfterQualityFilter: number;
  factsInContext: number;
  sourcesIncluded: string[];
  ecosystemsFound: string[];
  warnings: string[];
  contextPreview: string;
  retrievalDurationMs: number;
}

export interface EcologicalBuiltContext {
  queryType: EcologicalQueryType;
  facts: EcologicalGroundingFactPreview[];
  ecosystemsFound: string[];
  contextPreview: string;
  coverage: CoverageReport;
  inspection: EcologicalInspectionSnapshot | null;
}

export interface BuildEcologicalContextInput {
  prompt: string;
  ecosystems?: string[];
  categories?: GroundingCategory[];
  maxFacts?: number;
  includeInspection?: boolean;
}

function trimFactText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_FACT_TEXT_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_FACT_TEXT_LENGTH - 3).trimEnd()}...`;
}

function toFactPreview(fact: GroundingFactRow): EcologicalGroundingFactPreview {
  return {
    id: fact.id,
    category: fact.category,
    slug: fact.slug,
    title: fact.title,
    valuePreview: trimFactText(fact.fact_text),
    importance: fact.importance,
    sourceCitationKey: fact.citation_key,
    sourceYear: fact.source_year,
  };
}

function buildContextPreview(facts: EcologicalGroundingFactPreview[], queryType: EcologicalQueryType): string {
  const sections: string[] = [
    "Grounding policy (ecological domain):",
    "- Use only the grounded ecological context below.",
    "- Domain: environmental_ecology — scientific ecosystem data only.",
    "- Do not invent species, ecosystems, or ecological facts outside this context.",
    "- If context is insufficient, say exactly: Não encontrei informação suficiente no banco para responder com segurança.",
  ];

  if (queryType === "speculative") {
    sections.push("- Query classified as SPECULATIVE. Signal this clearly in your answer.");
  }
  if (queryType === "modeling") {
    sections.push("- Query classified as MODELING/AI. Use modeling-approach facts only. Do not treat AI as primary ecological truth.");
  }
  if (queryType === "artificial-project") {
    sections.push("- Query involves artificial ecosystems/projects. Clearly distinguish from natural ecosystems.");
  }

  const byCategory = new Map<string, EcologicalGroundingFactPreview[]>();
  facts.forEach((f) => {
    const arr = byCategory.get(f.category) ?? [];
    arr.push(f);
    byCategory.set(f.category, arr);
  });

  const categoryOrder: GroundingCategory[] = [
    "ecosystem",
    "concept",
    "abiotic-factor",
    "formation-process",
    "species",
    "artificial-project",
    "modeling-approach",
    "reference",
  ];

  categoryOrder.forEach((cat) => {
    const catFacts = byCategory.get(cat);
    if (!catFacts || catFacts.length === 0) return;
    sections.push(``, `[${cat}]`);
    catFacts.forEach((f) => {
      const source = f.sourceCitationKey ? ` (${f.sourceCitationKey}${f.sourceYear ? `, ${f.sourceYear}` : ""})` : "";
      sections.push(`- ${f.title}: ${f.valuePreview}${source}`);
    });
  });

  return sections.join("\n");
}

export class EcologicalContextBuilderService {
  async buildContext(input: BuildEcologicalContextInput): Promise<EcologicalBuiltContext> {
    const startMs = Date.now();

    const requestedEcosystems = Array.from(
      new Set((input.ecosystems ?? []).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0))
    );
    const maxFacts = input.maxFacts ?? 16;
    const queryType = classifyEcologicalQuery(input.prompt);
    const ambiguousWarnings = detectAmbiguousTerms(input.prompt);

    // Determine categories: use explicit input or recommend from query type
    const effectiveCategories: GroundingCategory[] =
      input.categories && input.categories.length > 0
        ? input.categories
        : recommendedCategories(queryType);

    // Fetch raw facts from DB
    const rawFacts = await ecologicalGroundingRepository.listGroundingFacts({
      ecosystemSlugs: requestedEcosystems,
      categories: effectiveCategories,
      maxFacts: Math.max(maxFacts * 3, 30),
    });

    // Apply quality filter (active, has source, has citation_key, correct domain)
    const qualityFiltered = filterValidFacts(rawFacts);

    // Apply category whitelist
    const categoryFiltered = filterByAllowedCategories(qualityFiltered, effectiveCategories);

    // Rank by relevance (requested ecosystems first, importance, source quality)
    const ranked = rankFacts(categoryFiltered, requestedEcosystems);

    // Limit to maxFacts
    const selected = ranked.slice(0, maxFacts);

    // Coverage validation
    const coverage = validateCoverage(selected, queryType, requestedEcosystems);
    coverage.warnings.push(...ambiguousWarnings);

    const factsPreview = selected.map(toFactPreview);
    const ecosystemsFound = Array.from(
      new Set(
        factsPreview
          .filter((f) => f.category === "ecosystem")
          .map((f) => f.slug)
      )
    );

    const contextPreview = buildContextPreview(factsPreview, queryType);

    const durationMs = Date.now() - startMs;

    contextLogger.debug(
      {
        queryType,
        rawFactsScanned: rawFacts.length,
        qualityFiltered: qualityFiltered.length,
        selected: selected.length,
        ecosystems: ecosystemsFound,
        warnings: coverage.warnings,
        durationMs,
      },
      "Ecological context built"
    );

    const inspection: EcologicalInspectionSnapshot | null = input.includeInspection
      ? {
          domainUsed: "environmental_ecology",
          categoriesAccepted: effectiveCategories,
          requestedEcosystems,
          queryType,
          rawFactsScanned: rawFacts.length,
          factsAfterQualityFilter: qualityFiltered.length,
          factsInContext: selected.length,
          sourcesIncluded: Array.from(new Set(selected.filter((f) => f.citation_key).map((f) => f.citation_key!))),
          ecosystemsFound,
          warnings: coverage.warnings,
          contextPreview,
          retrievalDurationMs: durationMs,
        }
      : null;

    return {
      queryType,
      facts: factsPreview,
      ecosystemsFound,
      contextPreview,
      coverage,
      inspection,
    };
  }
}

export const ecologicalContextBuilderService = new EcologicalContextBuilderService();
