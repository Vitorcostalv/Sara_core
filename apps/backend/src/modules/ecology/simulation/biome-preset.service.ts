export interface BiomePreset {
  displayName: string;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
  keywords: string[];
}

// Maps biome slugs → climate parameters that produce that biome in the terrain generator.
// Values are tuned against toBiomeSuggestion() in terrain-generator.service.ts.
const BIOME_PRESETS: Record<string, BiomePreset> = {
  cerrado: {
    displayName: "Cerrado",
    baseTemperatureC: 24,
    basePrecipitationMm: 1050,
    baseHumidityPct: 52,
    keywords: ["cerrado", "cerradão", "savana brasileira", "savana do brasil", "savannah brasileiro"],
  },
  pantanal: {
    displayName: "Pantanal",
    baseTemperatureC: 26,
    basePrecipitationMm: 1200,
    baseHumidityPct: 78,
    keywords: ["pantanal", "planície alagada", "pântano", "wetland brasileiro", "bacia do pantanal"],
  },
  amazonia: {
    displayName: "Amazônia",
    baseTemperatureC: 28,
    basePrecipitationMm: 2800,
    baseHumidityPct: 88,
    keywords: [
      "amazonia", "amazônia", "floresta amazônica", "amazon", "amazonian",
      "floresta tropical úmida", "floresta tropical umida", "selva tropical",
    ],
  },
  caatinga: {
    displayName: "Caatinga",
    baseTemperatureC: 28,
    basePrecipitationMm: 380,
    baseHumidityPct: 28,
    keywords: ["caatinga", "sertão", "sertao", "nordeste seco", "semi-árido", "semiarido", "bioma caatinga"],
  },
  "mata-atlantica": {
    displayName: "Mata Atlântica",
    baseTemperatureC: 22,
    basePrecipitationMm: 2100,
    baseHumidityPct: 80,
    keywords: ["mata atlântica", "mata atlantica", "atlantic forest", "mata costeira"],
  },
  pampa: {
    displayName: "Pampa",
    baseTemperatureC: 16,
    basePrecipitationMm: 1300,
    baseHumidityPct: 68,
    keywords: ["pampa", "pampas", "campos sulinos", "campanha gaúcha", "gaucha", "pampeano"],
  },
  mangue: {
    displayName: "Manguezal",
    baseTemperatureC: 26,
    basePrecipitationMm: 1800,
    baseHumidityPct: 86,
    keywords: ["mangue", "manguezal", "mangrove", "mangrovía", "mangrovial"],
  },
  deserto: {
    displayName: "Deserto",
    baseTemperatureC: 33,
    basePrecipitationMm: 90,
    baseHumidityPct: 12,
    keywords: ["deserto", "desert", "árido", "arid", "sahara", "árida", "semi-deserto"],
  },
  tundra: {
    displayName: "Tundra",
    baseTemperatureC: -7,
    basePrecipitationMm: 240,
    baseHumidityPct: 54,
    keywords: ["tundra", "ártico", "arctic", "permafrost", "polar", "gelado"],
  },
  taiga: {
    displayName: "Taiga",
    baseTemperatureC: 3,
    basePrecipitationMm: 450,
    baseHumidityPct: 62,
    keywords: ["taiga", "boreal", "floresta boreal", "siberia", "sibéria", "floresta de coníferas"],
  },
  "floresta-temperada": {
    displayName: "Floresta Temperada",
    baseTemperatureC: 12,
    basePrecipitationMm: 900,
    baseHumidityPct: 65,
    keywords: ["floresta temperada", "temperate forest", "deciduous forest", "floresta caduca"],
  },
  pradaria: {
    displayName: "Pradaria",
    baseTemperatureC: 15,
    basePrecipitationMm: 680,
    baseHumidityPct: 55,
    keywords: ["pradaria", "prairie", "steppe", "estepe", "savana temperada", "grassland", "campos"],
  },
  "floresta-tropical": {
    displayName: "Floresta Tropical",
    baseTemperatureC: 27,
    basePrecipitationMm: 2400,
    baseHumidityPct: 85,
    keywords: ["floresta tropical", "tropical forest", "jungle", "selva", "rainforest"],
  },
  mediterraneo: {
    displayName: "Mediterrâneo",
    baseTemperatureC: 18,
    basePrecipitationMm: 550,
    baseHumidityPct: 52,
    keywords: ["mediterrâneo", "mediterraneo", "mediterranean", "chaparral", "maquis"],
  },
};

export class BiomePresetService {
  findBySlug(slug: string): BiomePreset | null {
    return BIOME_PRESETS[slug] ?? null;
  }

  findByKeyword(text: string): { slug: string; preset: BiomePreset } | null {
    const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    let bestSlug: string | null = null;
    let bestScore = 0;

    for (const [slug, preset] of Object.entries(BIOME_PRESETS)) {
      for (const keyword of preset.keywords) {
        const normalizedKeyword = keyword
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "");
        if (normalized.includes(normalizedKeyword)) {
          const score = normalizedKeyword.length;
          if (score > bestScore) {
            bestScore = score;
            bestSlug = slug;
          }
        }
      }
    }

    if (!bestSlug) return null;
    return { slug: bestSlug, preset: BIOME_PRESETS[bestSlug]! };
  }

  listAll(): Array<{ slug: string } & BiomePreset> {
    return Object.entries(BIOME_PRESETS).map(([slug, preset]) => ({ slug, ...preset }));
  }
}

export const biomePresetService = new BiomePresetService();
