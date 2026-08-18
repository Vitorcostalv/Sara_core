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
  TaxonGroup,
  TrophicLevel,
} from "./fauna-definition.service";
import {
  resourceAvailabilityEvaluator,
  resourceNeedsFor,
  RESOURCE_LABELS,
  type ResourceType,
} from "./resource-base";
import { plausibilityBand, type PlausibilityBand } from "./ecological-plausibility.service";
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
  /** Population target before the invasion phase is applied. */
  baselinePopulation?: number;
  /** Human-readable ecological basis for the projected interaction. */
  reason?: string;
}

export interface InvasionPhase {
  label: string;
  tSeconds: number;
  invaderPop: number;
  nativeDeltas: Record<string, number>;
}

export type InvasiveScenarioType = "documented-invasive" | "hypothetical-introduction";

export interface InvasiveImpactVector {
  key: string;
  label: string;
  /** Relative educational index: negative reduces a component, positive increases a pressure. */
  value: number;
  detail: string;
}

export interface InvaderConsequences {
  scenarioType: InvasiveScenarioType;
  summary: string;
  causalChains: string[][];
  impactVectors: InvasiveImpactVector[];
}

// Named impact mechanisms, so an invasion is described by *how* it harms the ecosystem
// rather than by vague "damage". Aligned with the categories used by GISD/CABI/IUCN-EICAT.
export type InvasiveMechanismKind =
  | "predacao"
  | "competicao-alimentar"
  | "competicao-espaco"
  | "engenharia-habitat"
  | "transmissao-doenca"
  | "hibridizacao"
  | "sobrepastejo"
  | "supressao-vegetal"
  | "alteracao-aquatica"
  | "cascata-trofica"
  | "deplecao-recursos";

export interface InvasiveImpactMechanism {
  kind: InvasiveMechanismKind;
  label: string;
  description: string;
  severity: "baixa" | "moderada" | "alta";
  /** Native species common names and/or resource labels the mechanism acts on. */
  targets: string[];
}

export interface AffectedResource {
  type: ResourceType;
  label: string;
  detail: string;
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
    scenarioType: InvasiveScenarioType;
  };
  consequences: InvaderConsequences;
  nativeImpacts: NativeImpact[];
  phases: InvasionPhase[];
  /** Named ecological mechanisms through which the invader would act (empty if it can't establish). */
  impactMechanisms: InvasiveImpactMechanism[];
  /** Basal resources the invader would draw down / alter. */
  affectedResources: AffectedResource[];
  /** Numeric establishment plausibility (0–100) + band. */
  establishmentPlausibility: { score: number; label: PlausibilityBand };
  /** Qualitative spread pressure once established. */
  spreadPressure: "baixa" | "moderada" | "alta";
  plausibility: PlausibilityAssessment;
  explanation: ScientificExplanation & { text: string };
  /** Explicitly stated uncertainties for this scenario. */
  uncertainties: string[];
  /** MVP modeling assumptions behind the deterministic projection. */
  mvpAssumptions: string[];
  limitations: string[];
}

// ─── Invader profiles (deterministic backbone; LLM-independent) ───────────────

export interface InvaderProfile {
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
  /** Named impact mechanisms this invader is known/expected to drive when established. */
  mechanisms: InvasiveMechanismKind[];
  keywords: string[];
  /** Coarse taxon for non-mammal invaders (fish, amphibian, invertebrate). */
  taxonGroup?: TaxonGroup;
  /** Short note on what the establishment depends on (curated). */
  establishmentNote?: string;
  /** Curated, species-specific uncertainty notes appended to the generic ones. */
  uncertaintyNotes?: string[];
}

export const INVADER_PROFILES: InvaderProfile[] = [
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
    mechanisms: ["predacao", "competicao-espaco", "cascata-trofica"],
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
    mechanisms: ["predacao", "competicao-espaco", "cascata-trofica"],
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
    mechanisms: ["predacao", "competicao-espaco", "cascata-trofica"],
    keywords: ["tigre", "tiger", "panthera tigris"],
  },
  {
    displayName: "Javali",
    scientificName: "Sus scrofa",
    category: "herbivore-large",
    trophicLevel: "mesopredator",
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
    preyCategories: ["bird", "herbivore-small"],
    competesCategories: ["herbivore-large", "herbivore-small"],
    mechanisms: ["predacao", "sobrepastejo", "supressao-vegetal", "competicao-alimentar", "engenharia-habitat", "transmissao-doenca"],
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
    mechanisms: ["sobrepastejo", "supressao-vegetal", "competicao-alimentar", "deplecao-recursos", "engenharia-habitat"],
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
    mechanisms: ["alteracao-aquatica", "competicao-alimentar", "deplecao-recursos", "engenharia-habitat"],
    keywords: ["tilápia", "tilapia", "oreochromis"],
    establishmentNote: "Estabelece-se em águas quentes e eutróficas; tolera baixa oxigenação.",
    uncertaintyNotes: ["Impacto depende de conectividade hídrica e manejo de tanques."],
  },
  {
    displayName: "Búfalo-asiático",
    scientificName: "Bubalus bubalis",
    category: "herbivore-large",
    trophicLevel: "herbivore",
    feedingStrategy: "herbivore",
    compatiblePresets: ["pantanal", "amazonia", "pradaria", "mata-atlantica"],
    preyCategories: [],
    competesCategories: ["herbivore-large"],
    mechanisms: ["sobrepastejo", "engenharia-habitat", "supressao-vegetal", "competicao-alimentar", "alteracao-aquatica"],
    keywords: ["bufalo", "búfalo", "bubalus", "bufalo asiatico"],
    establishmentNote: "Prospera em planícies alagáveis; pisoteio altera margens e macrófitas.",
    uncertaintyNotes: ["Densidade e dano dependem de manejo pecuário local."],
  },
  {
    displayName: "Cabra-doméstica",
    scientificName: "Capra hircus",
    category: "herbivore-large",
    trophicLevel: "herbivore",
    feedingStrategy: "herbivore",
    compatiblePresets: ["caatinga", "cerrado", "pradaria", "deserto", "mediterraneo"],
    preyCategories: [],
    competesCategories: ["herbivore-large", "herbivore-small"],
    mechanisms: ["sobrepastejo", "supressao-vegetal", "deplecao-recursos", "competicao-alimentar", "engenharia-habitat"],
    keywords: ["cabra", "bode", "capra hircus", "caprino"],
    establishmentNote: "Generalista resistente à seca; sobrepastejo severo em semiárido.",
    uncertaintyNotes: ["Ferala vs. manejada muda muito a pressão sobre a vegetação."],
  },
  {
    displayName: "Lebre-europeia",
    scientificName: "Lepus europaeus",
    category: "herbivore-small",
    trophicLevel: "herbivore",
    feedingStrategy: "herbivore",
    compatiblePresets: ["pradaria", "pampa", "cerrado"],
    preyCategories: [],
    competesCategories: ["herbivore-small"],
    mechanisms: ["sobrepastejo", "competicao-alimentar", "deplecao-recursos"],
    keywords: ["lebre", "lebre europeia", "lepus"],
    establishmentNote: "Estabelece-se em campos abertos temperados/subtropicais.",
  },
  {
    displayName: "Tucunaré",
    scientificName: "Cichla ocellaris",
    category: "fish",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["pantanal", "amazonia", "floresta-tropical"],
    preyCategories: ["fish"],
    competesCategories: ["fish"],
    mechanisms: ["predacao", "competicao-alimentar", "cascata-trofica"],
    keywords: ["tucunare", "tucunaré", "cichla"],
    taxonGroup: "peixe",
    establishmentNote: "Predador voraz introduzido fora da bacia amazônica em reservatórios.",
    uncertaintyNotes: ["Efeito de cascata depende da comunidade de peixes nativos."],
  },
  {
    displayName: "Rã-touro",
    scientificName: "Lithobates catesbeianus",
    category: "predator-medium",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["mata-atlantica", "floresta-tropical", "pantanal", "amazonia"],
    preyCategories: ["herbivore-small"],
    competesCategories: ["herbivore-small"],
    mechanisms: ["predacao", "competicao-alimentar", "transmissao-doenca"],
    keywords: ["ra-touro", "rã-touro", "lithobates", "bullfrog"],
    taxonGroup: "anfíbio",
    establishmentNote: "Escapa de ranários; predador/competidor de anfíbios nativos.",
    uncertaintyNotes: ["Vetor potencial de quitridiomicose (Bd) — risco sanitário incerto."],
  },
  {
    displayName: "Caramujo-gigante-africano",
    scientificName: "Lissachatina fulica",
    category: "herbivore-small",
    trophicLevel: "herbivore",
    feedingStrategy: "herbivore",
    compatiblePresets: ["mata-atlantica", "amazonia", "floresta-tropical", "cerrado"],
    preyCategories: [],
    competesCategories: ["herbivore-small"],
    mechanisms: ["supressao-vegetal", "competicao-alimentar", "transmissao-doenca", "deplecao-recursos"],
    keywords: ["caramujo", "caramujo gigante", "achatina", "lissachatina"],
    taxonGroup: "invertebrado",
    establishmentNote: "Prospera em áreas úmidas e antropizadas; alta prolificidade.",
    uncertaintyNotes: ["Hospedeiro de Angiostrongylus — risco à saúde humana."],
  },
  {
    displayName: "Mexilhão-dourado",
    scientificName: "Limnoperna fortunei",
    category: "fish",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: ["pantanal", "amazonia", "floresta-tropical"],
    preyCategories: [],
    competesCategories: ["fish"],
    mechanisms: ["alteracao-aquatica", "competicao-espaco", "engenharia-habitat", "deplecao-recursos"],
    keywords: ["mexilhao dourado", "mexilhão-dourado", "limnoperna"],
    taxonGroup: "invertebrado",
    establishmentNote: "Bivalve filtrador que incrusta substratos e altera a teia planctônica.",
    uncertaintyNotes: ["Dispersão por hidrovias e cascos é difícil de conter."],
  },
  {
    displayName: "Gato-doméstico feral",
    scientificName: "Felis catus",
    category: "predator-medium",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["cerrado", "caatinga", "mata-atlantica", "pampa", "pradaria", "floresta-temperada", "floresta-tropical", "mediterraneo", "montanha"],
    preyCategories: ["herbivore-small", "bird"],
    competesCategories: ["predator-medium"],
    mechanisms: ["predacao", "competicao-espaco", "cascata-trofica"],
    keywords: ["gato feral", "gato asselvajado", "gato domestico", "felis catus"],
    establishmentNote: "Predador generalista associado a ambientes naturais próximos de ocupação humana.",
    uncertaintyNotes: ["O impacto depende da densidade de gatos e do acesso à fauna silvestre."],
  },
  {
    displayName: "Cão feral",
    scientificName: "Canis lupus familiaris",
    category: "predator-medium",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["cerrado", "caatinga", "mata-atlantica", "pampa", "pradaria", "floresta-temperada", "floresta-tropical", "pantanal", "montanha"],
    preyCategories: ["herbivore-small", "herbivore-large"],
    competesCategories: ["predator-medium", "predator-large"],
    mechanisms: ["predacao", "competicao-espaco", "transmissao-doenca"],
    keywords: ["cao feral", "cão feral", "cachorro feral", "cao asselvajado", "canis lupus familiaris"],
    establishmentNote: "Pode formar grupos livres e explorar áreas naturais próximas a assentamentos.",
    uncertaintyNotes: ["A distinção entre indivíduo errante e população feral estabelecida exige dados locais."],
  },
  {
    displayName: "Rato-preto",
    scientificName: "Rattus rattus",
    category: "herbivore-small",
    trophicLevel: "mesopredator",
    feedingStrategy: "omnivore",
    compatiblePresets: ["cerrado", "caatinga", "amazonia", "mata-atlantica", "pantanal", "pampa", "mangue", "pradaria", "floresta-temperada", "floresta-tropical", "mediterraneo"],
    preyCategories: ["bird", "herbivore-small"],
    competesCategories: ["herbivore-small"],
    mechanisms: ["predacao", "competicao-alimentar", "transmissao-doenca", "deplecao-recursos"],
    keywords: ["rato-preto", "rato preto", "rattus rattus", "rato de telhado"],
    establishmentNote: "Onívoro oportunista com alta associação a transporte, construções e ilhas.",
    uncertaintyNotes: ["A pressão sobre ninhos e sementes varia com a oferta de alimento antrópico."],
  },
  {
    displayName: "Peixe-leão",
    scientificName: "Pterois volitans",
    category: "fish",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["oceano", "mangue"],
    preyCategories: ["fish"],
    competesCategories: ["fish"],
    mechanisms: ["predacao", "competicao-alimentar", "cascata-trofica"],
    keywords: ["peixe-leao", "peixe-leão", "pterois", "lionfish"],
    taxonGroup: "peixe",
    establishmentNote: "Predador marinho associado a recifes, costões e habitats costeiros quentes.",
    uncertaintyNotes: ["O MVP representa oceano e manguezal, mas não resolve a estrutura fina de recifes."],
  },
  {
    displayName: "Carpa-comum",
    scientificName: "Cyprinus carpio",
    category: "fish",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: ["pantanal", "amazonia", "floresta-tropical", "floresta-temperada"],
    preyCategories: [],
    competesCategories: ["fish"],
    mechanisms: ["alteracao-aquatica", "engenharia-habitat", "competicao-alimentar", "deplecao-recursos"],
    keywords: ["carpa", "carpa-comum", "carpa comum", "cyprinus carpio"],
    taxonGroup: "peixe",
    establishmentNote: "Peixe bentívoro capaz de aumentar turbidez e ressuspender sedimentos.",
    uncertaintyNotes: ["A alteração do habitat depende da profundidade, densidade e tipo de sedimento."],
  },
  {
    displayName: "Esquilo-cinzento",
    scientificName: "Sciurus carolinensis",
    category: "herbivore-small",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: ["floresta-temperada", "mata-atlantica", "mediterraneo"],
    preyCategories: [],
    competesCategories: ["herbivore-small"],
    mechanisms: ["competicao-alimentar", "deplecao-recursos", "transmissao-doenca", "supressao-vegetal"],
    keywords: ["esquilo-cinzento", "esquilo cinzento", "sciurus carolinensis", "grey squirrel"],
    establishmentNote: "Generalista arborícola favorecido por florestas fragmentadas e áreas verdes.",
    uncertaintyNotes: ["A competição depende da presença de esquilos nativos com nicho semelhante."],
  },
  {
    displayName: "Vison-americano",
    scientificName: "Neogale vison",
    category: "predator-medium",
    trophicLevel: "mesopredator",
    feedingStrategy: "carnivore",
    compatiblePresets: ["taiga", "tundra", "floresta-temperada", "pantanal", "pampa", "montanha"],
    preyCategories: ["fish", "bird", "herbivore-small"],
    competesCategories: ["predator-medium"],
    mechanisms: ["predacao", "competicao-espaco", "cascata-trofica"],
    keywords: ["vison", "vison-americano", "vison americano", "neogale vison", "american mink"],
    establishmentNote: "Predador semiaquático associado a rios, lagos e áreas úmidas.",
    uncertaintyNotes: ["A conectividade entre corpos d'água controla dispersão e persistência."],
  },
  {
    displayName: "Pardal-doméstico",
    scientificName: "Passer domesticus",
    category: "bird",
    trophicLevel: "herbivore",
    feedingStrategy: "omnivore",
    compatiblePresets: ["cerrado", "caatinga", "pampa", "pradaria", "floresta-temperada", "mediterraneo", "montanha"],
    preyCategories: [],
    competesCategories: ["bird", "herbivore-small"],
    mechanisms: ["competicao-alimentar", "competicao-espaco", "transmissao-doenca"],
    keywords: ["pardal", "pardal-domestico", "pardal-doméstico", "passer domesticus", "house sparrow"],
    taxonGroup: "ave",
    establishmentNote: "Ave sinantrópica generalista que ocupa áreas abertas e construídas.",
    uncertaintyNotes: ["O terreno natural do MVP não representa diretamente estruturas urbanas usadas para nidificação."],
  },
];

export const INVADER_CONSEQUENCES: Record<string, InvaderConsequences> = {
  "Sus scrofa": {
    scenarioType: "documented-invasive",
    summary: "Revolve o solo, reduz plântulas, favorece erosão, compete por alimento e também consome ovos e pequenos vertebrados.",
    causalChains: [
      ["Javalis aumentam", "solo é revolvido", "plântulas diminuem", "regeneração vegetal cai", "erosão aumenta"],
      ["Busca oportunista por alimento", "ovos e pequenos vertebrados são consumidos", "recrutamento da fauna diminui"],
    ],
    impactVectors: [
      { key: "vegetacao", label: "Vegetação", value: -35, detail: "Redução relativa da cobertura rasteira." },
      { key: "regeneracao", label: "Regeneração vegetal", value: -40, detail: "Consumo e destruição de plântulas." },
      { key: "disturbio-solo", label: "Distúrbio do solo", value: 60, detail: "Revolvimento durante o forrageamento." },
      { key: "erosao", label: "Pressão de erosão", value: 25, detail: "Solo exposto fica mais vulnerável." },
      { key: "predacao-ovos", label: "Predação de ovos", value: 20, detail: "Consumo oportunista de ninhos e ovos." },
      { key: "competicao", label: "Competição alimentar", value: 20, detail: "Sobreposição com consumidores nativos." },
      { key: "doenca", label: "Risco de doença", value: 25, detail: "Potencial de transmissão de patógenos." },
    ],
  },
  "Panthera leo": {
    scenarioType: "hypothetical-introduction",
    summary: "Predador introduzido hipoteticamente: pressiona herbívoros médios e grandes e compete com grandes carnívoros nativos.",
    causalChains: [["Leões são introduzidos", "mortalidade de herbívoros aumenta", "herbivoria muda", "vegetação responde indiretamente"]],
    impactVectors: [],
  },
  "Canis lupus": {
    scenarioType: "hypothetical-introduction",
    summary: "Introdução hipotética de predador; altera mortalidade e comportamento das presas sem pressupor colapso automático.",
    causalChains: [["Lobos são introduzidos", "ungulados mudam abundância e comportamento", "pressão de herbivoria se redistribui", "surge uma cascata trófica incerta"]],
    impactVectors: [],
  },
  "Panthera tigris": {
    scenarioType: "hypothetical-introduction",
    summary: "Introdução hipotética com forte predação de mamíferos médios e grandes e competição com predadores nativos.",
    causalChains: [["Tigres são introduzidos", "presas pouco adaptadas sofrem predação", "populações vulneráveis diminuem", "a rede de predadores se reorganiza"]],
    impactVectors: [],
  },
  "Oryctolagus cuniculus": {
    scenarioType: "documented-invasive",
    summary: "Sobrepastejo, consumo de brotos e plântulas, competição com herbívoros e aumento de solo exposto.",
    causalChains: [["Coelhos aumentam", "brotos e plântulas diminuem", "regeneração cai", "solo exposto aumenta", "erosão cresce"]],
    impactVectors: [],
  },
  "Oreochromis niloticus": {
    scenarioType: "documented-invasive",
    summary: "Compete com peixes nativos, altera a rede trófica e pode modificar substratos de áreas rasas durante a reprodução.",
    causalChains: [["Tilápias aumentam", "competição por alimento e espaço cresce", "peixes nativos perdem recursos", "comunidade aquática se reorganiza"]],
    impactVectors: [],
  },
  "Bubalus bubalis": {
    scenarioType: "documented-invasive",
    summary: "Pastejo e pisoteio compactam o solo, degradam margens úmidas, aumentam turbidez e alteram habitats reprodutivos.",
    causalChains: [["Búfalos ferais aumentam", "pisoteio de margens cresce", "solo compacta e erode", "turbidez aumenta", "habitats de aves diminuem"]],
    impactVectors: [],
  },
  "Capra hircus": {
    scenarioType: "documented-invasive",
    summary: "Consome folhas, arbustos e plântulas, impede regeneração e favorece erosão, sobretudo em ilhas e ambientes secos.",
    causalChains: [["Cabras aumentam", "plântulas diminuem", "regeneração florestal cai", "cobertura vegetal diminui", "erosão aumenta"]],
    impactVectors: [],
  },
  "Lepus europaeus": {
    scenarioType: "documented-invasive",
    summary: "Aumenta herbivoria sobre gramíneas, brotos e mudas e compete com herbívoros nativos em altas densidades.",
    causalChains: [["Lebres aumentam", "consumo de brotos e gramíneas cresce", "recursos para herbívoros nativos diminuem", "competição aumenta"]],
    impactVectors: [],
  },
  "Cichla ocellaris": {
    scenarioType: "documented-invasive",
    summary: "Preda intensamente peixes menores, compete com predadores nativos e reorganiza a rede trófica fora de sua bacia natural.",
    causalChains: [["Tucunarés aumentam", "peixes pequenos diminuem", "presas desses peixes podem aumentar", "rede trófica se reorganiza"]],
    impactVectors: [],
  },
  "Lithobates catesbeianus": {
    scenarioType: "documented-invasive",
    summary: "Preda anfíbios, peixes e pequenos vertebrados, compete com anfíbios nativos e pode disseminar patógenos.",
    causalChains: [["Rãs-touro aumentam", "predação e competição sobre anfíbios crescem", "anfíbios nativos diminuem", "risco de disseminação de patógenos aumenta"]],
    impactVectors: [],
  },
  "Lissachatina fulica": {
    scenarioType: "documented-invasive",
    summary: "Causa herbivoria intensa, compete com moluscos nativos e pode transportar organismos de importância sanitária.",
    causalChains: [["Caramujos aumentam", "consumo de plantas e plântulas cresce", "regeneração diminui", "competição com moluscos nativos aumenta"]],
    impactVectors: [],
  },
  "Limnoperna fortunei": {
    scenarioType: "documented-invasive",
    summary: "Forma colônias densas, altera filtração, plâncton e nutrientes e causa bioincrustação em estruturas humanas.",
    causalChains: [["Mexilhões se adensam", "filtração da água aumenta", "plâncton disponível muda", "ciclagem de nutrientes e cadeia alimentar se alteram"]],
    impactVectors: [],
  },
  "Felis catus": {
    scenarioType: "documented-invasive",
    summary: "Preda aves, pequenos mamíferos e répteis, com efeitos especialmente severos em ilhas e fauna sem predadores semelhantes.",
    causalChains: [["Gatos ferais aumentam", "predação de pequenos vertebrados cresce", "recrutamento das populações cai", "risco de extinção local aumenta"]],
    impactVectors: [],
  },
  "Canis lupus familiaris": {
    scenarioType: "documented-invasive",
    summary: "Persegue e preda fauna silvestre, interfere com carnívoros nativos e pode transmitir doenças.",
    causalChains: [["Cães ferais aumentam", "perseguição e predação crescem", "fauna evita áreas ocupadas", "uso do habitat e sobrevivência diminuem"]],
    impactVectors: [],
  },
  "Rattus rattus": {
    scenarioType: "documented-invasive",
    summary: "Preda ovos e filhotes, consome sementes e frutos e ameaça especialmente ilhas e áreas de nidificação.",
    causalChains: [["Ratos aumentam", "ovos, filhotes e sementes diminuem", "recrutamento de aves e plantas cai", "comunidade insular se empobrece"]],
    impactVectors: [],
  },
  "Pterois volitans": {
    scenarioType: "documented-invasive",
    summary: "Consome peixes pequenos e juvenis, reduz recrutamento em recifes e compete com predadores nativos.",
    causalChains: [["Peixes-leão aumentam", "juvenis de peixes diminuem", "recrutamento do recife cai", "comunidade recifal se reorganiza"]],
    impactVectors: [
      { key: "peixes-pequenos", label: "Peixes pequenos", value: -55, detail: "Redução relativa por predação." },
      { key: "juvenis", label: "Juvenis de peixes", value: -65, detail: "Pressão elevada sobre o recrutamento." },
      { key: "competicao", label: "Competição entre predadores", value: 30, detail: "Sobreposição de alimento com predadores nativos." },
      { key: "predacao", label: "Pressão de predação", value: 70, detail: "Intensificação da mortalidade de presas." },
      { key: "rede-trofica", label: "Alteração da rede trófica", value: 55, detail: "Efeito propagado pela comunidade recifal." },
    ],
  },
  "Cyprinus carpio": {
    scenarioType: "documented-invasive",
    summary: "Revolve sedimentos, eleva turbidez e nutrientes e prejudica plantas aquáticas e a qualidade do habitat.",
    causalChains: [["Carpas aumentam", "sedimento é revolvido", "turbidez aumenta", "plantas aquáticas diminuem", "abrigo de pequenos peixes diminui"]],
    impactVectors: [
      { key: "turbidez", label: "Turbidez", value: 55, detail: "Ressuspensão de sedimentos." },
      { key: "vegetacao-aquatica", label: "Vegetação aquática", value: -45, detail: "Menor entrada de luz e perturbação física." },
      { key: "sedimento", label: "Distúrbio do sedimento", value: 65, detail: "Forrageamento no fundo." },
      { key: "nutrientes", label: "Nutrientes na água", value: 30, detail: "Liberação a partir do sedimento." },
      { key: "habitat", label: "Qualidade do habitat", value: -35, detail: "Perda de vegetação e água mais turva." },
    ],
  },
  "Sciurus carolinensis": {
    scenarioType: "documented-invasive",
    summary: "Compete por alimento e espaço, danifica árvores ao retirar casca e altera a dinâmica de sementes.",
    causalChains: [["Esquilos-cinzentos aumentam", "competição e retirada de casca crescem", "árvores sofrem danos", "regeneração e dinâmica de sementes mudam"]],
    impactVectors: [],
  },
  "Neogale vison": {
    scenarioType: "documented-invasive",
    summary: "Predador semiaquático de aves aquáticas, pequenos mamíferos, anfíbios e peixes, sobretudo próximo à água.",
    causalChains: [["Visons aumentam", "predação em margens e ninhos cresce", "aves aquáticas e pequenos mamíferos diminuem", "comunidade ribeirinha se altera"]],
    impactVectors: [],
  },
  "Passer domesticus": {
    scenarioType: "documented-invasive",
    summary: "Compete por alimento e principalmente por cavidades de nidificação, reduzindo oportunidades reprodutivas de aves nativas.",
    causalChains: [["Pardais aumentam", "ocupação de cavidades cresce", "aves nativas perdem locais de ninho", "sucesso reprodutivo diminui"]],
    impactVectors: [],
  },
};

function consequencesFor(profile: InvaderProfile): InvaderConsequences {
  return INVADER_CONSEQUENCES[profile.scientificName] ?? {
    scenarioType: "hypothetical-introduction",
    summary: "Consequências específicas ainda não foram cadastradas para esta espécie.",
    causalChains: [],
    impactVectors: [],
  };
}

const GENERIC_PROFILE: InvaderProfile = {
  displayName: "Espécie invasora",
  scientificName: "Espécie não catalogada",
  category: "herbivore-large",
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  compatiblePresets: [],
  preyCategories: [],
  competesCategories: ["herbivore-large", "herbivore-small"],
  mechanisms: ["competicao-alimentar"],
  keywords: [],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function resolveProfile(speciesText: string): InvaderProfile {
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

export function projectNativeImpacts(
  profile: InvaderProfile,
  natives: SpeciesDefinition[],
  survives: boolean,
  invaderResourceNeeds: ResourceType[],
): NativeImpact[] {
  return natives.map((native) => {
    if (survives && profile.preyCategories.includes(native.category)) {
      return {
        speciesId: native.id,
        commonName: native.commonName,
        effect: "predation",
        populationDelta: -Math.max(1, Math.round(native.populationTarget * 0.55)),
        baselinePopulation: native.populationTarget,
        reason: `Presa compatível com a estratégia alimentar de ${profile.displayName}.`,
      };
    }

    const sharedResources = native.resourceNeeds.filter((resource) =>
      invaderResourceNeeds.includes(resource),
    );
    const sharesFoodBase =
      profile.feedingStrategy === "carnivore"
        ? native.feedingStrategy === "carnivore"
        : sharedResources.length > 0;

    if (survives && profile.competesCategories.includes(native.category) && sharesFoodBase) {
      return {
        speciesId: native.id,
        commonName: native.commonName,
        effect: "competition",
        populationDelta: -Math.max(1, Math.round(native.populationTarget * 0.3)),
        baselinePopulation: native.populationTarget,
        reason:
          sharedResources.length > 0
            ? `Compartilha recursos: ${sharedResources.map((resource) => RESOURCE_LABELS[resource]).join(", ")}.`
            : `Compartilha a base de presas com ${profile.displayName}.`,
      };
    }

    return {
      speciesId: native.id,
      commonName: native.commonName,
      effect: "none",
      populationDelta: 0,
      baselinePopulation: native.populationTarget,
      reason: survives
        ? "Sem predação ou sobreposição de recursos modelada."
        : "A invasora não se estabelece neste cenário.",
    };
  });
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

function taxonGroupFor(category: FaunaCategory): TaxonGroup {
  if (category === "fish") return "peixe";
  if (category === "bird") return "ave";
  return "mamífero";
}

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
    const consequences = consequencesFor(profile);
    const intendedBiome = terrainResult.biomeSlug;
    const survives =
      profile.compatiblePresets.length > 0 && profile.compatiblePresets.includes(intendedBiome);

    // 3. Impactos sobre os nativos.
    const preyNatives = natives.filter((n) => profile.preyCategories.includes(n.category));
    const invaderResourceNeeds = resourceNeedsFor({
      category: profile.category,
      feedingStrategy: profile.feedingStrategy,
      // Basal needs follow the intended scenario, not residual cells in the generated grid.
      // Otherwise a small forest patch in the Cerrado can incorrectly add canopy resources.
      habitableBiomes: [intendedBiome],
    });
    const nativeImpacts = projectNativeImpacts(
      profile,
      natives,
      survives,
      invaderResourceNeeds,
    );

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
      taxonGroup: profile.taxonGroup ?? taxonGroupFor(profile.category),
      nativeStatus: "introduced",
      resourceNeeds: invaderResourceNeeds,
      confidence: profile.compatiblePresets.length > 0 ? 0.6 : 0.3,
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
    // Ground the explanation in the scenario explicitly selected by the user. Residual
    // render biomes are useful for terrain variation, but must not inject unrelated facts.
    const ecosystemSlugs = [terrainResult.biomeSlug];
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

    // 7. Impacto ecológico nomeado (só é ativo quando o invasor consegue se estabelecer).
    const resourceAssessment = resourceAvailabilityEvaluator.assessFromGrid(terrainResult.terrain, natives);
    const affectedResources = buildAffectedResources(invader.resourceNeeds, resourceAssessment);
    const impactMechanisms = survives
      ? buildImpactMechanisms(profile, nativeImpacts, affectedResources)
      : [];

    const establishmentScore = establishmentPlausibilityScore(survives, profile, preyNatives.length, scientific);

    return {
      terrain: terrainResult.terrain,
      resolvedBiomes,
      invader,
      invaderProfile: {
        displayName: profile.displayName,
        scientificName: profile.scientificName,
        nativeBiomes: profile.compatiblePresets,
        survives,
        scenarioType: consequences.scenarioType,
      },
      consequences,
      nativeImpacts,
      phases,
      impactMechanisms,
      affectedResources,
      establishmentPlausibility: { score: establishmentScore, label: plausibilityBand(establishmentScore) },
      spreadPressure: spreadPressureFor(survives, profile),
      plausibility,
      explanation: { ...scientific, text: explanationText },
      uncertainties: buildUncertainties(profile, survives, scientific),
      mvpAssumptions: [
        ...(profile.establishmentNote ? [`Requisito de estabelecimento: ${profile.establishmentNote}`] : []),
        "Estabelecimento é decidido por compatibilidade de bioma (intenção do local), não por modelo climático contínuo.",
        "Impactos sobre nativos são frações determinísticas da população-alvo, não dinâmica populacional integrada.",
        "Mecanismos de impacto vêm de um perfil por espécie inspirado em GISD/CABI/EICAT, não de dados de ocorrência ao vivo.",
      ],
      limitations: buildLimitations(profile, terrainResult, scientific),
    };
  }
}

// ─── Impact mechanisms / resources / establishment ───────────────────────────────

const MECHANISM_LABELS: Record<InvasiveMechanismKind, string> = {
  predacao: "Predação de nativos",
  "competicao-alimentar": "Competição por alimento",
  "competicao-espaco": "Competição por espaço/território",
  "engenharia-habitat": "Engenharia de habitat",
  "transmissao-doenca": "Transmissão de doença/patógeno",
  hibridizacao: "Hibridização com nativos",
  sobrepastejo: "Sobrepastejo",
  "supressao-vegetal": "Supressão da vegetação",
  "alteracao-aquatica": "Alteração de ecossistema aquático",
  "cascata-trofica": "Risco de cascata trófica",
  "deplecao-recursos": "Depleção de recursos",
};

function buildAffectedResources(
  needs: ResourceType[],
  assessment: ReturnType<typeof resourceAvailabilityEvaluator.assessFromGrid>
): AffectedResource[] {
  const available = new Map(assessment.resourceBase.map((r) => [r.type, r.availability]));
  return needs
    .filter((need) => (available.get(need) ?? 0) > 0)
    .map((need) => ({
      type: need,
      label: RESOURCE_LABELS[need],
      detail: `Recurso presente no local (disponibilidade ${available.get(need)}) e explorado pelo invasor.`,
    }));
}

export function buildImpactMechanisms(
  profile: InvaderProfile,
  impacts: NativeImpact[],
  affectedResources: AffectedResource[]
): InvasiveImpactMechanism[] {
  const predated = impacts.filter((i) => i.effect === "predation").map((i) => i.commonName);
  const competed = impacts.filter((i) => i.effect === "competition").map((i) => i.commonName);
  const resourceTargets = affectedResources.map((r) => r.label);

  return profile.mechanisms.map((kind) => {
    let targets: string[] = [];
    let severity: InvasiveImpactMechanism["severity"] = "moderada";
    let description = "";

    switch (kind) {
      case "predacao":
        targets = predated;
        severity = predated.length >= 2 ? "alta" : predated.length === 1 ? "moderada" : "baixa";
        description = "Reduz diretamente populações de presas nativas por predação.";
        break;
      case "competicao-alimentar":
        targets = competed.length > 0 ? competed : resourceTargets;
        severity = competed.length >= 2 ? "alta" : "moderada";
        description = "Disputa alimento com a fauna nativa de nicho semelhante.";
        break;
      case "competicao-espaco":
        targets = competed;
        severity = "moderada";
        description = "Disputa território, tocas ou sítios de nidificação com nativos.";
        break;
      case "engenharia-habitat":
        targets = resourceTargets;
        severity = "moderada";
        description = "Revolve solo/margens e altera a estrutura física do habitat.";
        break;
      case "sobrepastejo":
        targets = resourceTargets;
        severity = resourceTargets.length > 0 ? "alta" : "moderada";
        description = "Consumo intenso de vegetação herbácea acima da taxa de reposição.";
        break;
      case "supressao-vegetal":
        targets = resourceTargets;
        severity = "moderada";
        description = "Suprime rebrota e regeneração vegetal, empobrecendo a base de recurso.";
        break;
      case "alteracao-aquatica":
        targets = resourceTargets;
        severity = "alta";
        description = "Altera turbidez, vegetação aquática e cadeia trófica do corpo d'água.";
        break;
      case "cascata-trofica":
        targets = [...predated, ...competed];
        severity = "moderada";
        description = "A pressão sobre um nível trófico pode propagar efeitos pela cadeia.";
        break;
      case "deplecao-recursos":
        targets = resourceTargets;
        severity = "moderada";
        description = "Reduz a disponibilidade de recursos basais para consumidores nativos.";
        break;
      case "transmissao-doenca":
        targets = competed;
        severity = "moderada";
        description = "Pode introduzir patógenos a que nativos não têm resistência.";
        break;
      case "hibridizacao":
        targets = competed;
        severity = "moderada";
        description = "Cruzamento com nativos aparentados dilui o patrimônio genético local.";
        break;
    }

    return { kind, label: MECHANISM_LABELS[kind], description, severity, targets };
  });
}

export function establishmentPlausibilityScore(
  survives: boolean,
  profile: InvaderProfile,
  preyCount: number,
  scientific: ScientificExplanation
): number {
  if (!survives) return profile.compatiblePresets.length === 0 ? 15 : 22;
  let score = 58;
  if (profile.preyCategories.length === 0) score += 6; // generalist herbivore/omnivore establishes readily
  else score += Math.min(12, preyCount * 5);
  if (scientific.coverage === "sufficient") score += 15;
  else if (scientific.facts.length > 0) score += 6;
  return Math.max(0, Math.min(100, score));
}

export function spreadPressureFor(survives: boolean, profile: InvaderProfile): "baixa" | "moderada" | "alta" {
  if (!survives) return "baixa";
  const highSpread =
    profile.feedingStrategy === "omnivore" ||
    profile.category === "herbivore-small" ||
    profile.category === "fish";
  return highSpread ? "alta" : "moderada";
}

function buildUncertainties(
  profile: InvaderProfile,
  survives: boolean,
  scientific: ScientificExplanation
): string[] {
  const uncertainties: string[] = [...(profile.uncertaintyNotes ?? [])];
  if (profile.compatiblePresets.length === 0) {
    uncertainties.push("Espécie não catalogada: mecanismos e habitat de origem são inferidos genericamente.");
  }
  if (scientific.facts.length === 0) {
    uncertainties.push("Sem fatos do banco para calibrar severidade — magnitudes são heurísticas.");
  }
  if (survives) {
    uncertainties.push("Velocidade real de dispersão depende de fatores (barreiras, manejo) não modelados.");
  }
  uncertainties.push("A projeção é educacional e determinística; não representa risco quantitativo validado.");
  return uncertainties;
}

export function buildPhases(survives: boolean, impacts: NativeImpact[]): InvasionPhase[] {
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
    for (const i of impacted) {
      if (fraction === 0 || i.populationDelta === 0) {
        out[i.speciesId] = 0;
        continue;
      }
      const magnitude = Math.max(1, Math.round(Math.abs(i.populationDelta) * fraction));
      out[i.speciesId] = Math.sign(i.populationDelta) * magnitude;
    }
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
