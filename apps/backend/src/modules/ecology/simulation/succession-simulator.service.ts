/**
 * Succession simulator — MVP stage-based model.
 * Models primary and secondary succession as discrete stages.
 * SIMPLIFICATION: stage durations and species are representative references only.
 * Real succession is non-linear, context-dependent, and influenced by propagule pressure.
 */

export type SuccessionType = "primary" | "secondary";

export interface SuccessionStage {
  stage: number;              // 0 = pioneer → 4 = climax
  label: string;
  characteristicFunctionalTypes: string[];
  exampleSpeciesNotes: string;
  estimatedDurationYearsMin: number;
  estimatedDurationYearsMax: number;
  dominantProcess: string;
  disturbanceVulnerability: "high" | "moderate" | "low";
}

export interface SuccessionResult {
  type: SuccessionType;
  ecosystemReference: string | null;
  startingStage: number;
  stages: SuccessionStage[];
  estimatedYearsToClimax: number;
  isDisturbanceReset: boolean;
  simulationNote: string;
  warnings: string[];
}

// ─── Stage definitions ────────────────────────────────────────────────────────

const PRIMARY_STAGES: SuccessionStage[] = [
  {
    stage: 0,
    label: "Colonização pioneira",
    characteristicFunctionalTypes: ["liquens", "musgos", "cianobactérias"],
    exampleSpeciesNotes: "Organismos tolerantes a substrato nu e extremos abióticos.",
    estimatedDurationYearsMin: 5,
    estimatedDurationYearsMax: 50,
    dominantProcess: "Formação de substrato, fixação de nitrogênio, criação de solo incipiente",
    disturbanceVulnerability: "high",
  },
  {
    stage: 1,
    label: "Herbáceo inicial",
    characteristicFunctionalTypes: ["gramíneas anuais", "ervas ruderais", "fungos saprofíticos"],
    exampleSpeciesNotes: "Pioneiras vasculares com alto poder de dispersão e tolerância a solo pobre.",
    estimatedDurationYearsMin: 5,
    estimatedDurationYearsMax: 30,
    dominantProcess: "Acumulação de matéria orgânica, aumento da diversidade",
    disturbanceVulnerability: "high",
  },
  {
    stage: 2,
    label: "Arbustivo e herbáceo perene",
    characteristicFunctionalTypes: ["arbustos", "gramíneas perenes", "leguminosas fixadoras"],
    exampleSpeciesNotes: "Espécies de ciclo médio que enriquecem o solo.",
    estimatedDurationYearsMin: 15,
    estimatedDurationYearsMax: 80,
    dominantProcess: "Fechamento do dossel arbustivo, acúmulo de serapilheira",
    disturbanceVulnerability: "moderate",
  },
  {
    stage: 3,
    label: "Florestal secundário",
    characteristicFunctionalTypes: ["árvores pioneiras", "lianas", "sub-bosque diverso"],
    exampleSpeciesNotes: "Árvores de rápido crescimento e espécies secundárias tolerantes à sombra.",
    estimatedDurationYearsMin: 30,
    estimatedDurationYearsMax: 150,
    dominantProcess: "Estruturação vertical, estratificação, aumento de biomassa",
    disturbanceVulnerability: "moderate",
  },
  {
    stage: 4,
    label: "Clímax (climax-community)",
    characteristicFunctionalTypes: ["árvores climácicas", "epífitas", "fauna especializada"],
    exampleSpeciesNotes: "Espécies tolerantes à sombra, longevo, ecossistema estável com memória ecológica consolidada.",
    estimatedDurationYearsMin: 100,
    estimatedDurationYearsMax: 1000,
    dominantProcess: "Manutenção da estrutura, ciclagem fechada de nutrientes, resiliência alta",
    disturbanceVulnerability: "low",
  },
];

const SECONDARY_STAGES: SuccessionStage[] = [
  {
    stage: 0,
    label: "Rebrota e banco de propágulos",
    characteristicFunctionalTypes: ["rebrota de raiz", "germinação do banco de sementes", "gramíneas oportunistas"],
    exampleSpeciesNotes: "Espécies com banco de sementes ativo ou rebrota vegetativa.",
    estimatedDurationYearsMin: 1,
    estimatedDurationYearsMax: 10,
    dominantProcess: "Regeneração a partir de memória biológica residual",
    disturbanceVulnerability: "high",
  },
  {
    stage: 1,
    label: "Herbáceo-arbustivo regenerativo",
    characteristicFunctionalTypes: ["ervas perenes", "arbustos nodrizas", "fungos micorrízicos"],
    exampleSpeciesNotes: "Recolonização mais rápida do que em sucessão primária pela presença de solo formado.",
    estimatedDurationYearsMin: 5,
    estimatedDurationYearsMax: 30,
    dominantProcess: "Fechamento parcial do dossel, início da estratificação",
    disturbanceVulnerability: "high",
  },
  {
    stage: 2,
    label: "Florestal inicial regenerativo",
    characteristicFunctionalTypes: ["árvores pioneiras rápidas", "lianas", "epífitas oportunistas"],
    exampleSpeciesNotes: "Diversidade em expansão, dominância por poucas espécies oportunistas.",
    estimatedDurationYearsMin: 15,
    estimatedDurationYearsMax: 60,
    dominantProcess: "Acúmulo de biomassa, competição por luz",
    disturbanceVulnerability: "moderate",
  },
  {
    stage: 3,
    label: "Florestal intermediário",
    characteristicFunctionalTypes: ["árvores de dossel", "espécies de sub-bosque tolerantes", "decompositores especializados"],
    exampleSpeciesNotes: "Estrutura florestal consolidando-se, diversidade funcional aumentando.",
    estimatedDurationYearsMin: 30,
    estimatedDurationYearsMax: 100,
    dominantProcess: "Estratificação vertical, ciclagem de nutrientes eficiente",
    disturbanceVulnerability: "moderate",
  },
  {
    stage: 4,
    label: "Clímax secundário",
    characteristicFunctionalTypes: ["espécies climácicas", "fauna especializada", "epífitas diversas"],
    exampleSpeciesNotes: "Estrutura próxima ao clímax histórico, dependente de conectividade e pressão de propágulos.",
    estimatedDurationYearsMin: 80,
    estimatedDurationYearsMax: 500,
    dominantProcess: "Consolidação de relações mutualísticas, resiliência alta",
    disturbanceVulnerability: "low",
  },
];

// ─── Ecosystem-specific overrides ────────────────────────────────────────────

const ECOSYSTEM_NOTES: Record<string, string> = {
  cerrado: "No Cerrado, a sucessão é fortemente modulada pelo fogo recorrente e pode oscilar entre estágios intermediários.",
  pantanal: "No Pantanal, pulsos de inundação reiniciam parcialmente a sucessão em habitats fluviais.",
  manguezal: "Em manguezais, a colonização depende fortemente de salinidade, sedimentação e hidroperíodo mareal.",
  "recife-de-coral": "Em recifes de coral, a recuperação após distúrbio depende de temperatura, sedimentação e banco de larvas.",
  tundra: "Na tundra, a sucessão é extremamente lenta e sensível ao regime de permafrost.",
  taiga: "Na taiga, incêndios são agentes estruturantes e a sucessão pós-fogo é bem estudada.",
};

// ─── Service ──────────────────────────────────────────────────────────────────

export interface SuccessionInput {
  type: SuccessionType;
  startingStage: number;
  disturbanceIntensity: number; // 0–1
  ecosystemSlug?: string;
}

export class SuccessionSimulatorService {
  simulate(input: SuccessionInput): SuccessionResult {
    const stageTable = input.type === "primary" ? PRIMARY_STAGES : SECONDARY_STAGES;

    // High disturbance resets to earlier stage
    const disturbanceReset = input.disturbanceIntensity > 0.7;
    const effectiveStart = disturbanceReset
      ? Math.max(0, input.startingStage - Math.round(input.disturbanceIntensity * 2))
      : input.startingStage;

    const stages = stageTable.slice(effectiveStart);

    const totalYearsMin = stages.reduce((sum, s) => sum + s.estimatedDurationYearsMin, 0);
    const totalYearsMax = stages.reduce((sum, s) => sum + s.estimatedDurationYearsMax, 0);
    const estimatedYearsToClimax = Math.round((totalYearsMin + totalYearsMax) / 2);

    const warnings: string[] = [];
    if (input.disturbanceIntensity > 0.5) {
      warnings.push(
        `Distúrbio moderado-alto (${Math.round(input.disturbanceIntensity * 100)}%) pode deslocar a comunidade para estágio anterior.`
      );
    }
    if (disturbanceReset && input.startingStage !== effectiveStart) {
      warnings.push(
        `Distúrbio intenso reiniciou a sucessão do estágio ${input.startingStage} para ${effectiveStart}.`
      );
    }

    const ecosystemNote = input.ecosystemSlug
      ? ECOSYSTEM_NOTES[input.ecosystemSlug] ?? null
      : null;

    if (ecosystemNote) warnings.push(ecosystemNote);

    return {
      type: input.type,
      ecosystemReference: input.ecosystemSlug ?? null,
      startingStage: effectiveStart,
      stages,
      estimatedYearsToClimax,
      isDisturbanceReset: disturbanceReset,
      simulationNote:
        "MVP succession simulation using stage-based model. " +
        "Real succession is non-linear and context-dependent. " +
        "Stage durations are order-of-magnitude estimates from Odum & Barrett (2005).",
      warnings,
    };
  }
}

export const successionSimulatorService = new SuccessionSimulatorService();
