import { ecologicalContextBuilderService } from "../grounding/ecological-context-builder.service";
import {
  ecologicalTerrainPromptService,
  type TerrainPromptResult,
} from "../llm/ecological-terrain-prompt.service";
import { faunaDefinitionService } from "./fauna-definition.service";
import type {
  FaunaCategory,
  FeedingStrategy,
  PredationProfile,
  SpeciesDefinition,
  TrophicLevel,
} from "./fauna-definition.service";
import type { TerrainGrid } from "./terrain-generator.service";
import type {
  PlausibilityAssessment,
  PlausibilityCriterion,
  PlausibilityRating,
  ScientificExplanation,
} from "../ecosystem-report.service";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface InvasiveScenarioInput {
  speciesText: string;
  locationText: string;
  width?: number;
  height?: number;
  seed?: number;
}

export type InvasionEffect = "predation" | "competition" | "none";

export interface NativeImpact {
  speciesId: string;
  commonName: string;
  effect: InvasionEffect;
  populationDelta: number;
}

export interface InvasionPhase {
  label: string;
  tSeconds: number;
  invaderPop: number;
  nativeDeltas: Record<string, number>;
}

export interface InvasiveScenarioResult {
  terrain: TerrainGrid;
  resolvedBiomes: string[];
  invader: SpeciesDefinition;
  invaderProfile: {
    displayName: string;
    scientificName: string;
    nativeBiomes: string[];
    survives: boolean;
  };
  nativeImpacts: NativeImpact[];
  phases: InvasionPhase[];
  plausibility: PlausibilityAssessment;
  explanation: ScientificExplanation & { text: string };
  limitations: string[];
}

// ─── Invader profiles (deterministic backbone; LLM-independent) ───────────────

interface InvaderProfile {
  displayName: string;
  scientificName: string;
  category: FaunaCategory;
  trophicLevel: TrophicLevel;
  feedingStrategy: FeedingStrategy;
  /**
   * Location presets (terrain biomeSlug vocabulary) where this species can establish.
   * Matched against the INTENDED biome of the location, not scattered grid cells — so a
   * minor grassland patch inside a rainforest doesn't wrongly make a savanna species plausible.
   */
  compatiblePresets: string[];
  preyCategories: FaunaCategory[];
  competesCategories: FaunaCategory[];
  keywords: string[];
}

const INVADER_PROFILES: InvaderProfile[] = [
  {
    displayName: "Leão",
    scientificName: "Panthera leo",
    category: "predator-large",
    trophicLevel: "apex",
    feedingStrategy: "carnivore",
    // Savana e mosaicos de bosque seco/semiárido — não floresta úmida.
    compatiblePresets: ["cerrado", "caatinga", "deserto", "pradaria", "mediterraneo"],
    preyCategories: ["herbivore-large", "herbivore-small"],
    competesCategories: ["predator-large", "predator-medium"],
    keywords: ["leão", "leao", "lion", "panthera leo"],
  },
  {
    displayName: "Lobo-cinzento",
    scientificName: "Canis lupus",
    category: "predator-large",
    trophicLevel: "apex",
    feedingStrategy: "carnivore",
    compatiblePresets: ["tundra", "taiga", "pradaria", "floresta-temperada", "montanha", "montanha-nevada", "deserto-frio"],
    preyCategories: ["herbivore-large", "herbivore-small"],
    competesCategories: ["predator-medium"],
    keywords: ["lobo", "wolf", "canis lupus", "lobo cinzento"],
  },
  {
    displayName: "Tigre",
    scientificName: "Panthera tigris",
    category: "predator-large",
    trophicLevel: "apex",
    feedingStrategy: "carnivore",
    compatiblePresets: ["amazonia", "floresta-tropical", "mata-atlantica", "floresta-temperada", "pantanal"],
    preyCategories: ["herbivore-large", "herbivore-small"],
    competesCategories: ["predator-large", "predator-medium"],
    keywords: ["tigre", "tiger", "panthera tigris"],
  },
  {
    displayName: "Javali",
    scientificName: "Sus scrofa",
    category: "herbivore-large",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: [
      "cerrado",
      "mata-atlantica",
      "pradaria",
      "floresta-temperada",
      "floresta-tropical",
      "caatinga",
      "pantanal",
      "mediterraneo",
      "amazonia",
    ],
    preyCategories: [],
    competesCategories: ["herbivore-large", "herbivore-small"],
    keywords: ["javali", "porco selvagem", "porco-do-mato", "wild boar", "sus scrofa"],
  },
  {
    displayName: "Coelho-europeu",
    scientificName: "Oryctolagus cuniculus",
    category: "herbivore-small",
    trophicLevel: "herbivore",
    feedingStrategy: "herbivore",
    compatiblePresets: ["pradaria", "cerrado", "mediterraneo", "caatinga", "mata-atlantica", "pampa"],
    preyCategories: [],
    competesCategories: ["herbivore-small"],
    keywords: ["coelho", "rabbit", "oryctolagus", "coelho europeu"],
  },
  {
    displayName: "Tilápia-do-nilo",
    scientificName: "Oreochromis niloticus",
    category: "fish",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: ["pantanal", "mangue", "amazonia", "floresta-tropical"],
    preyCategories: [],
    competesCategories: ["fish"],
    keywords: ["tilápia", "tilapia", "oreochromis"],
  },
];

const GENERIC_PROFILE: InvaderProfile = {
  displayName: "Espécie invasora",
  scientificName: "Espécie não catalogada",
  category: "herbivore-large",
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  compatiblePresets: [],
  preyCategories: [],
  competesCategories: ["herbivore-large", "herbivore-small"],
  keywords: [],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function resolveProfile(speciesText: string): InvaderProfile {
  const normalized = normalize(speciesText);
  let best: InvaderProfile | null = null;
  let bestScore = 0;
  for (const profile of INVADER_PROFILES) {
    for (const keyword of profile.keywords) {
      const nk = normalize(keyword);
      if (normalized.includes(nk) && nk.length > bestScore) {
        bestScore = nk.length;
        best = profile;
      }
    }
  }
  if (best) return best;
  // Fall back to the literal text as a generic invader (display only).
  return { ...GENERIC_PROFILE, displayName: speciesText.trim() || GENERIC_PROFILE.displayName };
}

// ─── Movement defaults by category (mirror the catalog) ──────────────────────

function movementFor(category: FaunaCategory): SpeciesDefinition["movementProfile"] {
  switch (category) {
    case "predator-large":
      return { maxSpeed: 3.6, turnRate: 2.0, fleeMultiplier: 1.2 };
    case "predator-medium":
      return { maxSpeed: 3.9, turnRate: 2.4, fleeMultiplier: 1.2 };
    case "herbivore-large":
      return { maxSpeed: 2.4, turnRate: 1.8, fleeMultiplier: 2.1 };
    case "herbivore-small":
      return { maxSpeed: 2.9, turnRate: 3.2, fleeMultiplier: 2.8 };
    case "bird":
      return { maxSpeed: 5.0, turnRate: 3.0, fleeMultiplier: 2.4 };
    case "fish":
      return { maxSpeed: 2.6, turnRate: 3.5, fleeMultiplier: 2.5 };
    default:
      return { maxSpeed: 2.6, turnRate: 2.2, fleeMultiplier: 2.0 };
  }
}

function flockFor(category: FaunaCategory): SpeciesDefinition["flockProfile"] {
  if (category === "predator-large" || category === "predator-medium") {
    return { formsFlocks: false, flockRadius: 5.5, separationDistance: 2.5 };
  }
  return { formsFlocks: true, flockRadius: 4.0, separationDistance: 0.9 };
}

// ─── Plausibility ─────────────────────────────────────────────────────────────

function massFor(category: FaunaCategory): number {
  switch (category) {
    case "predator-large":
      return 1.05;
    case "herbivore-large":
      return 0.88;
    case "predator-medium":
      return 0.55;
    case "bird":
      return 0.28;
    case "fish":
      return 0.3;
    default:
      return 0.3;
  }
}

function awarenessRangeFor(category: FaunaCategory): number {
  switch (category) {
    case "herbivore-large":
      return 5.4;
    case "herbivore-small":
      return 5.0;
    case "bird":
      return 5.6;
    case "fish":
      return 3.9;
    default:
      return 4.2;
  }
}

function predationFor(category: FaunaCategory, preyIds: string[]): PredationProfile | undefined {
  if (preyIds.length === 0) return undefined;
  const isLargeHunter = category === "predator-large";
  return {
    attackRange: isLargeHunter ? 1.0 : 0.82,
    damageRate: isLargeHunter ? 0.84 : 0.66,
    huntRange: isLargeHunter ? 6.8 : 5.8,
    hungerRate: isLargeHunter ? 0.014 : 0.018,
    starvationThreshold: isLargeHunter ? 1.15 : 1,
    satiationCooldownMs: isLargeHunter ? 4200 : 2800,
    preyPreference: Object.fromEntries(preyIds.map((id) => [id, 1])),
  };
}

const RATING_SCORE: Record<PlausibilityRating, number> = { alto: 2, medio: 1, baixo: 0 };

function collectBiomes(grid: TerrainGrid): string[] {
  const set = new Set<string>();
  for (const row of grid.cells) for (const cell of row) set.add(cell.biomeSuggestion);
  return Array.from(set);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class InvasiveScenarioService {
  async simulate(input: InvasiveScenarioInput): Promise<InvasiveScenarioResult> {
    // 1. Local → terreno + biomas + nativos.
    const terrainResult: TerrainPromptResult = await ecologicalTerrainPromptService.generate({
      prompt: input.locationText,
      width: input.width,
      height: input.height,
      seed: input.seed,
    });
    const resolvedBiomes = collectBiomes(terrainResult.terrain);
    const natives = faunaDefinitionService.resolve(terrainResult.terrain).species;

    // 2. Classifica o invasor (heurística determinística por palavra-chave) e avalia se o bioma
    //    pretendido do local (intenção do usuário) é compatível com o habitat de origem.
    const profile = resolveProfile(input.speciesText);
    const intendedBiome = terrainResult.biomeSlug;
    const survives =
      profile.compatiblePresets.length > 0 && profile.compatiblePresets.includes(intendedBiome);

    // 3. Impactos sobre os nativos.
    const preyNatives = natives.filter((n) => profile.preyCategories.includes(n.category));
    const nativeImpacts: NativeImpact[] = natives.map((n) => {
      if (survives && profile.preyCategories.includes(n.category)) {
        return {
          speciesId: n.id,
          commonName: n.commonName,
          effect: "predation",
          populationDelta: -Math.max(1, Math.round(n.populationTarget * 0.55)),
        };
      }
      if (survives && profile.competesCategories.includes(n.category)) {
        return {
          speciesId: n.id,
          commonName: n.commonName,
          effect: "competition",
          populationDelta: -Math.max(1, Math.round(n.populationTarget * 0.3)),
        };
      }
      return { speciesId: n.id, commonName: n.commonName, effect: "none", populationDelta: 0 };
    });

    // 4. Espécie invasora sintética (entra na cadeia do FaunaLayer).
    const predatedIds = nativeImpacts.filter((i) => i.effect === "predation").map((i) => i.speciesId);
    const invader: SpeciesDefinition = {
      id: `invasor-${normalize(profile.displayName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "especie"}`,
      commonName: profile.displayName,
      scientificName: profile.scientificName,
      category: profile.category,
      habitableBiomes: resolvedBiomes,
      diet: [...predatedIds],
      preySpeciesIds: [...predatedIds],
      trophicLevel: profile.trophicLevel,
      feedingStrategy: profile.feedingStrategy,
      mass: massFor(profile.category),
      awarenessRange: awarenessRangeFor(profile.category),
      predation: predationFor(profile.category, predatedIds),
      populationTarget: survives ? 8 : 2,
      movementProfile: movementFor(profile.category),
      flockProfile: flockFor(profile.category),
      habitatProfile: {
        primary: [],
        secondary: [],
        avoids: [],
        altitudePreference: "any",
        waterDependency: profile.category === "fish" ? "high" : "low",
        caveAffinity: "none",
      },
      behaviorProfile: {
        activityPeriod: "diurnal",
        socialBehavior: flockFor(profile.category).formsFlocks ? "herd" : "solitary",
        aggression: profile.feedingStrategy === "carnivore" ? 0.7 : 0.3,
        curiosity: 0.4,
        fear: 0.3,
        territoriality: 0.5,
        migration: 0.5,
      },
    };

    // 5. Linha do tempo determinística (introdução → dispersão → equilíbrio/colapso).
    const phases = buildPhases(survives, nativeImpacts);

    // 6. Grounding científico.
    const ecosystemSlugs = [terrainResult.biomeSlug, ...resolvedBiomes];
    const context = await ecologicalContextBuilderService.buildContext({
      prompt: `Espécie invasora "${profile.displayName}" em ${terrainResult.biomeName}. ${input.speciesText} ${input.locationText}`,
      ecosystems: Array.from(new Set(ecosystemSlugs)),
      maxFacts: 10,
    });

    const scientific: ScientificExplanation = {
      grounded: context.facts.length > 0,
      coverage: context.coverage.sufficient ? "sufficient" : "insufficient",
      facts: context.facts.map((f) => ({
        title: f.title,
        text: f.valuePreview,
        category: f.category,
        citationKey: f.sourceCitationKey,
        year: f.sourceYear,
      })),
      sources: Array.from(
        new Set(context.facts.map((f) => f.sourceCitationKey).filter((k): k is string => Boolean(k)))
      ),
    };

    const plausibility = buildPlausibility(profile, survives, terrainResult.biomeName, preyNatives.length, scientific);
    const explanationText = buildExplanationText(
      profile,
      terrainResult.biomeName,
      survives,
      preyNatives.length,
      scientific
    );

    return {
      terrain: terrainResult.terrain,
      resolvedBiomes,
      invader,
      invaderProfile: {
        displayName: profile.displayName,
        scientificName: profile.scientificName,
        nativeBiomes: profile.compatiblePresets,
        survives,
      },
      nativeImpacts,
      phases,
      plausibility,
      explanation: { ...scientific, text: explanationText },
      limitations: buildLimitations(profile, terrainResult, scientific),
    };
  }
}

function buildPhases(survives: boolean, impacts: NativeImpact[]): InvasionPhase[] {
  const impacted = impacts.filter((i) => i.effect !== "none");

  if (!survives) {
    const zero: Record<string, number> = {};
    for (const i of impacted) zero[i.speciesId] = 0;
    return [
      { label: "Introdução", tSeconds: 0, invaderPop: 2, nativeDeltas: { ...zero } },
      { label: "Estresse ambiental", tSeconds: 30, invaderPop: 2, nativeDeltas: { ...zero } },
      { label: "Declínio", tSeconds: 90, invaderPop: 1, nativeDeltas: { ...zero } },
      { label: "Fracasso da invasão", tSeconds: 180, invaderPop: 0, nativeDeltas: { ...zero } },
    ];
  }

  const fractionDeltas = (fraction: number): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const i of impacted) out[i.speciesId] = Math.round(i.populationDelta * fraction);
    return out;
  };

  return [
    { label: "Introdução", tSeconds: 0, invaderPop: 2, nativeDeltas: fractionDeltas(0) },
    { label: "Dispersão", tSeconds: 30, invaderPop: 6, nativeDeltas: fractionDeltas(0.35) },
    { label: "Estabelecimento", tSeconds: 90, invaderPop: 12, nativeDeltas: fractionDeltas(0.7) },
    { label: "Equilíbrio / colapso", tSeconds: 180, invaderPop: 18, nativeDeltas: fractionDeltas(1) },
  ];
}

function buildPlausibility(
  profile: InvaderProfile,
  survives: boolean,
  biomeName: string,
  preyCount: number,
  scientific: ScientificExplanation
): PlausibilityAssessment {
  const habitat: PlausibilityCriterion = {
    label: "Compatibilidade de habitat",
    rating: profile.compatiblePresets.length === 0 ? "baixo" : survives ? "alto" : "baixo",
    detail:
      profile.compatiblePresets.length === 0
        ? "Espécie não catalogada; habitat de origem desconhecido."
        : survives
        ? `O bioma do local (${biomeName}) é compatível com o habitat de origem da espécie.`
        : `O bioma do local (${biomeName}) não corresponde ao habitat de origem (${profile.compatiblePresets.join(", ")}).`,
  };

  const preyBase: PlausibilityCriterion = {
    label: "Base de presas/recursos",
    rating: !survives
      ? "baixo"
      : profile.preyCategories.length === 0
      ? "medio"
      : preyCount >= 2
      ? "alto"
      : preyCount >= 1
      ? "medio"
      : "baixo",
    detail: !survives
      ? "Sem habitat adequado, a base de presas/recursos é irrelevante para o estabelecimento."
      : profile.preyCategories.length === 0
      ? "Invasor herbívoro/onívoro: pressão por competição, não predação."
      : `${preyCount} grupo(s) de presas nativas compatíveis no local.`,
  };

  const dispersal: PlausibilityCriterion = {
    label: "Capacidade de estabelecimento",
    rating: survives ? "medio" : "baixo",
    detail: survives
      ? "Condições permitem dispersão e estabelecimento populacional."
      : "Sem habitat adequado, o estabelecimento tende ao fracasso.",
  };

  const grounding: PlausibilityCriterion = {
    label: "Grounding científico",
    rating: scientific.coverage === "sufficient" ? "alto" : scientific.facts.length > 0 ? "medio" : "baixo",
    detail: `${scientific.facts.length} fato(s) do banco; cobertura ${
      scientific.coverage === "sufficient" ? "suficiente" : "limitada"
    }.`,
  };

  const criteria = [habitat, preyBase, dispersal, grounding];
  const avg = criteria.reduce((sum, c) => sum + RATING_SCORE[c.rating], 0) / criteria.length;
  const overall: PlausibilityRating = avg >= 1.5 ? "alto" : avg >= 0.8 ? "medio" : "baixo";

  return {
    overall,
    criteria,
    caveat:
      "Avaliação heurística: cruza compatibilidade de habitat e base de recursos com a cobertura de " +
      "fatos do banco. Não substitui análise formal de risco de bioinvasão.",
  };
}

function buildExplanationText(
  profile: InvaderProfile,
  biomeName: string,
  survives: boolean,
  preyCount: number,
  scientific: ScientificExplanation
): string {
  const head = survives
    ? `${profile.displayName} é ecologicamente plausível em ${biomeName}: o bioma do local é compatível com seu habitat de origem`
    : `${profile.displayName} é pouco plausível em ${biomeName}: o bioma local não corresponde ao seu habitat de origem (${profile.compatiblePresets.join(", ") || "desconhecido"})`;

  const mechanism = survives
    ? profile.preyCategories.length > 0
      ? `, onde encontra ${preyCount} grupo(s) de presas nativas e pode reduzir suas populações por predação.`
      : `, competindo com a fauna nativa por recursos e espaço.`
    : `, de modo que tende a não se estabelecer (estresse térmico/alimentar e ausência de presas adequadas).`;

  const groundingNote = scientific.facts.length === 0
    ? " Observação: o banco não tem fatos científicos específicos para embasar este caso — explicação limitada."
    : scientific.coverage === "sufficient"
    ? " A avaliação é apoiada por fatos científicos do banco (ver fontes)."
    : " Há embasamento parcial no banco (ver fontes).";

  return `${head}${mechanism}${groundingNote}`;
}

function buildLimitations(
  profile: InvaderProfile,
  terrain: TerrainPromptResult,
  scientific: ScientificExplanation
): string[] {
  const limitations: string[] = [];
  if (profile.compatiblePresets.length === 0) {
    limitations.push(
      "Espécie invasora não catalogada: classificação genérica por competição, sem perfil ecológico específico."
    );
  }
  if (terrain.source === "default") {
    limitations.push("Não foi possível identificar o bioma do local; parâmetros genéricos foram usados.");
  }
  if (scientific.facts.length === 0) {
    limitations.push("Sem fatos científicos do banco para este cenário — a explicação não tem grounding.");
  }
  limitations.push(
    "A dinâmica de invasão é uma projeção heurística determinística, não um modelo populacional validado."
  );
  return limitations;
}

export const invasiveScenarioService = new InvasiveScenarioService();
