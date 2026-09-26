import { faunaDefinitionService, type SpeciesDefinition } from "./fauna-definition.service";
import {
  resourceAvailabilityEvaluator,
  type ResourceBaseAssessment,
  type ResourceType,
} from "./resource-base";
import type { TerrainGrid } from "./terrain-generator.service";

export interface InvasionEcosystemBaseline {
  flora: string;
  fauna: string[];
  structuralRule: string;
  keyResources: ResourceType[];
}

export interface NativeDefenseInteraction {
  speciesId: string;
  commonName: string;
  response: "predation" | "competition" | "avoidance";
  strength: "low" | "moderate" | "high";
  reason: string;
}

export interface InvasionCommunityResult {
  nativeSpecies: SpeciesDefinition[];
  resourceBase: ResourceBaseAssessment;
  defenses: NativeDefenseInteraction[];
  warnings: string[];
  baseline: InvasionEcosystemBaseline;
}

const FALLBACK_BASELINE: InvasionEcosystemBaseline = {
  flora: "Produtores e cobertura vegetal coerentes com o terreno resolvido.",
  fauna: [],
  structuralRule: "A comunidade deve conservar uma base de recursos e uma piramide trofica funcional.",
  keyResources: ["pastagem", "folhagem-arbustiva", "frutos-sementes", "detrito"],
};

export const INVASION_NATIVE_BIOMES: Record<string, string[]> = {
  cerrado: ["savana-tropical"],
  caatinga: ["caatinga"],
  amazonia: ["floresta-tropical-umida", "lago"],
  "mata-atlantica": ["mata-atlantica"],
  pantanal: ["pantanal", "lago", "savana-tropical"],
  pampa: ["pradaria-estepe"],
  pradaria: ["pradaria-estepe"],
  mangue: ["manguezal", "lago"],
  "floresta-tropical": ["floresta-tropical-umida"],
  "floresta-temperada": ["floresta-temperada", "taiga", "pradaria-estepe"],
  mediterraneo: ["mediterraneo", "pradaria-estepe"],
  deserto: ["deserto-quente"],
  "deserto-frio": ["deserto-frio"],
  tundra: ["tundra"],
  taiga: ["taiga"],
  montanha: ["montanha"],
  "montanha-nevada": ["montanha-nevada", "montanha"],
  oceano: ["oceano-pelagico"],
  antartida: ["antartida", "oceano-polar"],
};

/** Curadoria compacta usada tanto pelo motor deterministico quanto pelo contexto da IA. */
export const INVASION_ECOSYSTEM_BASELINES: Record<string, InvasionEcosystemBaseline> = {
  cerrado: { flora: "Savana de gramineas, arbustos e arvores baixas espacadas, resistentes a seca e fogo.", fauna: ["lobo-guara", "tamandua-bandeira", "tatu", "veado-campeiro", "ema", "onca-parda"], structuralRule: "Manter areas abertas; nao converter o Cerrado em floresta tropical fechada.", keyResources: ["pastagem", "folhagem-arbustiva", "frutos-sementes", "raizes-tuberculos"] },
  caatinga: { flora: "Cactaceas, bromelias e arvores deciduas adaptadas a seca, com pulso verde na estacao chuvosa.", fauna: ["asa-branca", "carcara", "tatu-peba", "moco", "prea", "veado-catingueiro"], structuralRule: "Baixa agua nao significa ausencia de biodiversidade ou de alimento sazonal.", keyResources: ["folhagem-arbustiva", "frutos-sementes", "raizes-tuberculos", "detrito"] },
  amazonia: { flora: "Floresta umida estratificada com dossel alto, palmeiras, cipos e epifitas.", fauna: ["onca-pintada", "harpia", "primatas", "anta", "queixada", "aves", "peixes"], structuralRule: "Preservar estratos de dossel, sub-bosque, solo e rede fluvial.", keyResources: ["folhagem-dossel", "frutos-sementes", "detrito", "vegetacao-aquatica"] },
  "mata-atlantica": { flora: "Floresta umida diversa com arvores altas, palmeiras, bromelias, samambaias e orquideas.", fauna: ["mico-leao-dourado", "muriqui", "bugio", "onca-pintada", "jaguatirica", "anta", "anfibios"], structuralRule: "Representar floresta estratificada e alta dependencia de umidade.", keyResources: ["folhagem-dossel", "frutos-sementes", "detrito", "nectar-polen"] },
  pantanal: { flora: "Mosaico sazonal de campos, florestas, areas alagadas e vegetacao aquatica.", fauna: ["jacare-do-pantanal", "capivara", "onca-pintada", "cervo-do-pantanal", "ariranha", "tuiuiu", "peixes"], structuralRule: "A inundacao sazonal deve conectar as cadeias terrestre e aquatica.", keyResources: ["pastagem", "vegetacao-aquatica", "plancton", "detrito"] },
  pampa: { flora: "Campos abertos dominados por gramineas, ervas e pequenos arbustos.", fauna: ["veado-campeiro", "graxaim-do-campo", "quero-quero", "ema", "tuco-tuco"], structuralRule: "Gramineas devem dominar visualmente e na capacidade de suporte.", keyResources: ["pastagem", "frutos-sementes", "raizes-tuberculos"] },
  pradaria: { flora: "Grandes extensoes de gramineas e herbaceas, com poucas arvores.", fauna: ["grandes herbivoros", "canideos", "raposas", "aves de campo"], structuralRule: "A base de pastagem deve ser maior que a biomassa de consumidores.", keyResources: ["pastagem", "frutos-sementes", "raizes-tuberculos"] },
  mangue: { flora: "Mangues com raizes especializadas em solo salino, lodoso e pobre em oxigenio.", fauna: ["caranguejos", "siris", "camaroes", "moluscos", "peixes juvenis", "aves"], structuralRule: "Tratar o manguezal como bercario e cadeia detritica costeira.", keyResources: ["detrito", "plancton", "algas", "vegetacao-aquatica"] },
  "floresta-tropical": { flora: "Arvores altas, vegetacao densa, cipos, palmeiras e epifitas.", fauna: ["primatas", "grandes felinos", "aves", "serpentes", "anfibios", "morcegos", "insetos"], structuralRule: "Distribuir fauna entre dossel, sub-bosque, solo e agua.", keyResources: ["folhagem-dossel", "frutos-sementes", "detrito", "nectar-polen"] },
  "floresta-temperada": { flora: "Carvalhos, bordos, faias e outras arvores sazonais.", fauna: ["cervos", "raposas", "lobos", "ursos", "esquilos", "corujas"], structuralRule: "A sazonalidade altera alimento, abrigo e atividade.", keyResources: ["folhagem-dossel", "frutos-sementes", "detrito", "folhagem-arbustiva"] },
  mediterraneo: { flora: "Arbustos, ervas e arvores resistentes ao calor, seca e fogo.", fauna: ["raposas", "coelhos", "lebres", "cabras selvagens", "repteis", "aves de rapina"], structuralRule: "Manter cobertura arbustiva aberta e produtividade limitada pela seca.", keyResources: ["folhagem-arbustiva", "frutos-sementes", "pastagem"] },
  deserto: { flora: "Cactos, suculentas e arbustos muito espacados e eficientes no uso de agua.", fauna: ["raposas-do-deserto", "roedores", "serpentes", "lagartos", "escorpioes", "insetos"], structuralRule: "Baixa capacidade de suporte exige populacoes pequenas e atividade sobretudo noturna.", keyResources: ["folhagem-arbustiva", "frutos-sementes", "detrito"] },
  "deserto-frio": { flora: "Gramineas resistentes, pequenos arbustos, musgos e liquens esparsos.", fauna: ["roedores", "lebres", "raposas", "lobos", "aves", "herbivoros de clima frio"], structuralRule: "Combinar aridez com forte sazonalidade termica.", keyResources: ["pastagem", "folhagem-arbustiva", "detrito"] },
  tundra: { flora: "Musgos, liquens, gramineas e arbustos baixos sobre permafrost.", fauna: ["rena", "boi-almiscarado", "raposa-do-artico", "lebre-artica", "lemingue", "coruja-das-neves"], structuralRule: "Vegetacao sempre baixa; produtividade concentrada no curto verao.", keyResources: ["pastagem", "folhagem-arbustiva", "detrito"] },
  taiga: { flora: "Floresta boreal de pinheiros, abetos e laricios.", fauna: ["alce", "rena", "urso", "lobo", "lince", "raposa", "lebre"], structuralRule: "Coniferas dominam e a cadeia deve suportar grandes herbivoros antes de predadores.", keyResources: ["folhagem-dossel", "folhagem-arbustiva", "detrito", "frutos-sementes"] },
  montanha: { flora: "Floresta na base, arbustos e campos de altitude, vegetacao alpina e rocha no topo.", fauna: ["cabras-montesas", "marmotas", "pumas", "condores", "aguias", "roedores"], structuralRule: "Altitude deve criar faixas graduais, nao um bioma uniforme.", keyResources: ["pastagem", "folhagem-arbustiva", "detrito"] },
  "montanha-nevada": { flora: "Liquens, musgos e plantas alpinas apenas abaixo do limite de neve permanente.", fauna: ["cabras-montesas", "iaques", "marmotas", "predadores e aves de altitude"], structuralRule: "Reduzir flora e capacidade de suporte conforme a altitude aumenta.", keyResources: ["pastagem", "detrito", "folhagem-arbustiva"] },
  oceano: { flora: "Fitoplancton e algas formam a base produtora; nao ha floresta terrestre.", fauna: ["zooplancton", "peixes de cardume", "atuns", "tubaroes", "lulas", "tartarugas", "cetaceos"], structuralRule: "Manter fitoplancton -> zooplancton -> peixes pequenos -> grandes predadores.", keyResources: ["plancton", "algas"] },
  antartida: { flora: "Liquens, musgos, algas e fitoplancton em ambiente dominado por gelo.", fauna: ["krill", "peixes", "pinguins", "focas", "baleias", "aves marinhas"], structuralRule: "Krill e central; nunca introduzir urso-polar como fauna nativa antartica.", keyResources: ["plancton", "algas", "detrito"] },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class InvasionCommunityService {
  consolidate(input: {
    terrain: TerrainGrid;
    intendedBiome: string;
    natives: SpeciesDefinition[];
    invader: SpeciesDefinition;
    survives: boolean;
  }): InvasionCommunityResult {
    const baseline = INVASION_ECOSYSTEM_BASELINES[input.intendedBiome] ?? FALLBACK_BASELINE;
    const intendedNativeBiomes = INVASION_NATIVE_BIOMES[input.intendedBiome];
    const curatedNatives = intendedNativeBiomes
      ? faunaDefinitionService.resolveBiomes(intendedNativeBiomes).species
      : input.natives;
    const caveNatives = input.natives.filter((species) => species.habitableBiomes.includes("caverna"));
    const nativeSource = Array.from(
      new Map([...curatedNatives, ...caveNatives].map((species) => [species.id, species])).values(),
    );
    const resourceFloors = Object.fromEntries(
      baseline.keyResources.map((resource) => [resource, 0.2]),
    ) as Partial<Record<ResourceType, number>>;
    const initialResources = resourceAvailabilityEvaluator.assessFromGrid(
      input.terrain,
      nativeSource,
      resourceFloors,
    );
    const availability = new Map(initialResources.resourceBase.map((resource) => [resource.type, resource.availability]));

    // Ajusta consumidores basais a capacidade de suporte em vez de deixa-los entrar no cenario
    // com uma populacao arbitraria que a flora local nao consegue sustentar.
    let nativeSpecies = nativeSource.map((species) => {
      if (species.resourceNeeds.length === 0) return { ...species };
      const support = Math.max(0, ...species.resourceNeeds.map((need) => availability.get(need) ?? 0));
      const factor = clamp(0.45 + support, 0.5, 1);
      return { ...species, populationTarget: Math.max(2, Math.round(species.populationTarget * factor)) };
    });

    // Cada cacador precisa ter presa realmente presente e sua populacao fica limitada pela biomassa
    // das presas. Isso evita cadeias que parecem completas no catalogo mas colapsam na animacao.
    const byId = new Map(nativeSpecies.map((species) => [species.id, species]));
    nativeSpecies = nativeSpecies
      .map((species) => {
        const preySpeciesIds = species.preySpeciesIds.filter((id) => byId.has(id));
        if (species.preySpeciesIds.length > 0 && preySpeciesIds.length === 0) return null;
        if (preySpeciesIds.length === 0) return species;
        const preyCapacity = preySpeciesIds.reduce((sum, id) => sum + (byId.get(id)?.populationTarget ?? 0), 0);
        return {
          ...species,
          diet: [...preySpeciesIds],
          preySpeciesIds,
          populationTarget: Math.max(1, Math.min(species.populationTarget, Math.floor(preyCapacity * 0.35))),
        };
      })
      .filter((species): species is SpeciesDefinition => species !== null);

    const defenses: NativeDefenseInteraction[] = [];
    if (input.survives) {
      nativeSpecies = nativeSpecies.map((species) => {
        const massRatio = species.mass / Math.max(0.1, input.invader.mass);
        const isNativeHunter = species.preySpeciesIds.length > 0 && species.feedingStrategy === "carnivore";
        if (isNativeHunter && massRatio >= 0.65) {
          const strength = massRatio >= 1.15 ? "high" : massRatio >= 0.85 ? "moderate" : "low";
          defenses.push({ speciesId: species.id, commonName: species.commonName, response: "predation", strength, reason: "Predador nativo com porte e agressividade suficientes para contestar ou predar o invasor." });
          const preySpeciesIds = Array.from(new Set([...species.preySpeciesIds, input.invader.id]));
          return {
            ...species,
            diet: preySpeciesIds,
            preySpeciesIds,
            predation: species.predation ? { ...species.predation, preyPreference: { ...(species.predation.preyPreference ?? {}), [input.invader.id]: 0.8 } } : species.predation,
          };
        }
        if (species.category === input.invader.category && species.mass >= input.invader.mass * 0.45) {
          defenses.push({ speciesId: species.id, commonName: species.commonName, response: "competition", strength: massRatio >= 0.9 ? "moderate" : "low", reason: "Ocupa nicho semelhante e pode reduzir o acesso do invasor a alimento ou territorio." });
        } else if (species.awarenessRange >= 4.5) {
          defenses.push({ speciesId: species.id, commonName: species.commonName, response: "avoidance", strength: "low", reason: "Detecta a ameaca a distancia e reduz encontros por fuga ou mudanca de habitat." });
        }
        return species;
      });
    }

    const resourceBase = resourceAvailabilityEvaluator.assessFromGrid(
      input.terrain,
      nativeSpecies,
      resourceFloors,
    );
    const warnings = [...resourceBase.resourceWarnings];
    if (nativeSpecies.length === 0) warnings.push("Nenhuma comunidade nativa funcional foi resolvida para o terreno.");
    if (!nativeSpecies.some((species) => species.resourceNeeds.length > 0)) warnings.push("A cadeia nao possui consumidores ligados explicitamente a flora ou aos recursos basais.");

    return { nativeSpecies, resourceBase, defenses, warnings, baseline };
  }
}

export const invasionCommunityService = new InvasionCommunityService();
