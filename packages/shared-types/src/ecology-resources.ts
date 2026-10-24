export type ResourceType =
  | "pastagem" // grass / herbaceous ground cover
  | "folhagem-arbustiva" // shrub / understory foliage
  | "folhagem-dossel" // canopy foliage / browse
  | "frutos-sementes" // fruits and seeds
  | "raizes-tuberculos" // roots and tubers
  | "vegetacao-aquatica" // aquatic macrophytes
  | "plancton" // plankton (aquatic base)
  | "algas" // algae / periphyton
  | "detrito" // detritus / organic litter
  | "materia-organica-cavernicola" // cave organic matter (guano, roots, drip-fed)
  | "carnica" // carrion (supports scavengers/decomposers)
  | "nectar-polen" // nectar and pollen (pollinators)
  | "recurso-agricola"; // crops / agricultural resource (relevant to invasive pressure)

type BiomeFamily = "forest" | "grassland" | "desert" | "freshwater" | "ocean" | "cold" | "mountain" | "cave";

export function biomeFamily(biome: string): BiomeFamily | null {
  if (biome === "caverna") return "cave";
  if (biome.startsWith("floresta") || biome === "mata-atlantica" || biome === "amazonia" || biome === "taiga") {
    return "forest";
  }
  if (["savana-tropical", "pradaria-estepe", "cerrado", "caatinga", "pampa"].includes(biome)) return "grassland";
  if (biome.startsWith("deserto")) return "desert";
  if (["lago", "pantanal", "manguezal"].includes(biome)) return "freshwater";
  if (["oceano-pelagico", "oceano-polar"].includes(biome)) return "ocean";
  if (["tundra", "antartida", "montanha-nevada"].includes(biome)) return "cold";
  if (biome === "montanha") return "mountain";
  return null;
}

// How strongly each biome family supplies each resource (0–1 per cell of that family).
export const FAMILY_RESOURCES: Record<BiomeFamily, Partial<Record<ResourceType, number>>> = {
  forest: {
    "folhagem-dossel": 1,
    "frutos-sementes": 0.9,
    "folhagem-arbustiva": 0.75,
    detrito: 0.7,
    "raizes-tuberculos": 0.4,
    "nectar-polen": 0.5,
    carnica: 0.3,
    pastagem: 0.25,
  },
  grassland: {
    pastagem: 1,
    "folhagem-arbustiva": 0.5,
    "frutos-sementes": 0.5,
    "raizes-tuberculos": 0.5,
    "nectar-polen": 0.45,
    detrito: 0.4,
    carnica: 0.3,
  },
  desert: { "folhagem-arbustiva": 0.4, "frutos-sementes": 0.3, pastagem: 0.2, carnica: 0.25 },
  freshwater: {
    "vegetacao-aquatica": 1,
    plancton: 0.7,
    algas: 0.6,
    detrito: 0.6,
    "raizes-tuberculos": 0.3,
    pastagem: 0.4,
    carnica: 0.2,
  },
  ocean: { plancton: 1, algas: 0.6, "vegetacao-aquatica": 0.4 },
  cold: { pastagem: 0.45, "folhagem-arbustiva": 0.4, "frutos-sementes": 0.2, detrito: 0.3, carnica: 0.3 },
  mountain: { pastagem: 0.5, "folhagem-arbustiva": 0.5, "frutos-sementes": 0.3, carnica: 0.25 },
  cave: { "materia-organica-cavernicola": 1, detrito: 0.5 },
};
