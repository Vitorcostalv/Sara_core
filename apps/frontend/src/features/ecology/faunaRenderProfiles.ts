import type { SpeciesDefinition } from "../../services/api/ecology";

export type FallbackShape = "box" | "cone" | "octahedron" | "dodecahedron";
export type BillboardMode = "camera-facing" | "yaw-only";
export type HabitatPlacement = "land" | "water" | "cave" | "air";

export interface SpeciesRenderProfile {
  speciesId: string;
  assetPath: string | null;
  fallbackShape: FallbackShape;
  baseScale: number;
  heightOffset: number;
  billboardMode: BillboardMode;
  habitatPlacement: HabitatPlacement;
  labelPriority: number;
  displayColor?: string;
  silhouetteStyle?: "photo-cutout" | "silhouette" | "field-guide";
}

// Only register ids that have a real file under apps/frontend/public/fauna/ — an unregistered
// species makes no network request and uses the polygon fallback (avoids 404 spam). These three
// are placeholder field-guide silhouettes shipped as billboard examples (herbivore, predator,
// invasive); replace the PNGs with final art without touching this map.
const SPECIES_ASSET_PATHS: Record<string, string> = {
  anta: "/fauna/anta.png",
  "aranha-cavernicola": "/fauna/aranha-cavernicola.png",
  "arara-azul": "/fauna/arara-azul.png",
  bugio: "/fauna/bugio.png",
  capivara: "/fauna/capivara.png",
  cutia: "/fauna/cutia.png",
  "formiga-cortadeira": "/fauna/formiga-cortadeira.png",
  "garca-branca": "/fauna/garca-branca.png",
  "gato-do-mato": "/fauna/gato-do-mato.png",
  "inseto-cavernicola": "/fauna/inseto-cavernicola.png",
  "invasor-bufalo-asiatico": "/fauna/invasor-bufalo-asiatico.png",
  "invasor-cabra-domestica": "/fauna/invasor-cabra-domestica.png",
  "invasor-caramujo-gigante-africano": "/fauna/invasor-caramujo-gigante-africano.png",
  "invasor-javali": "/fauna/invasor-javali.png",
  "invasor-lebre-europeia": "/fauna/invasor-lebre-europeia.png",
  "invasor-mexilhao-dourado": "/fauna/invasor-mexilhao-dourado.png",
  "invasor-ra-touro": "/fauna/invasor-ra-touro.png",
  "invasor-tilapia-do-nilo": "/fauna/invasor-tilapia-do-nilo.png",
  "invasor-tucunare": "/fauna/invasor-tucunare.png",
  jabuti: "/fauna/jabuti.png",
  "jacare-do-pantanal": "/fauna/jacare-do-pantanal.png",
  "lobo-guara": "/fauna/lobo-guara.png",
  morcego: "/fauna/morcego.png",
  "onca-parda": "/fauna/onca-parda.png",
  "onca-pintada": "/fauna/onca-pintada.png",
  paca: "/fauna/paca.png",
  "peixe-cego": "/fauna/peixe-cego.png",
  queixada: "/fauna/queixada.png",
  "sapo-cururu": "/fauna/sapo-cururu.png",
  seriema: "/fauna/seriema.png",
  "serpente-cavernicola": "/fauna/serpente-cavernicola.png",
  sucuri: "/fauna/sucuri.png",
  "tatu-galinha": "/fauna/tatu-galinha.png",
  "tucano-toco": "/fauna/tucano-toco.png",
  "veado-mateiro": "/fauna/veado-mateiro.png",
};

export const FAUNA_ASSET_CONVENTION = "apps/frontend/public/fauna/<species-id>.png";

function fallbackShapeFor(species: SpeciesDefinition): FallbackShape {
  if (species.feedingStrategy === "carnivore") return "cone";
  if (species.feedingStrategy === "omnivore") return "octahedron";
  if (species.category === "herbivore-large" || species.category === "predator-large") return "dodecahedron";
  return "box";
}

function habitatPlacementFor(species: SpeciesDefinition): HabitatPlacement {
  if (species.habitableBiomes.includes("caverna")) return "cave";
  if (species.category === "fish") return "water";
  if (species.category === "bird") return "air";
  return "land";
}

function baseScaleFor(species: SpeciesDefinition): number {
  const massScale = Math.min(1.6, Math.max(0.78, Math.sqrt(Math.max(0.08, species.mass || 0.2))));
  if (species.category === "bird") return 0.72 * massScale;
  if (species.category === "fish") return 0.82 * massScale;
  if (species.category === "predator-large" || species.category === "herbivore-large") return 0.96 * massScale;
  return 0.84 * massScale;
}

function heightOffsetFor(species: SpeciesDefinition): number {
  if (species.category === "bird") return 0.4;
  if (species.category === "fish") return 0.08;
  return 0.22;
}

function labelPriorityFor(species: SpeciesDefinition): number {
  let priority = 1;
  if ((species.preySpeciesIds?.length ?? 0) > 0) priority += 1;
  if (species.category === "predator-large" || species.category === "herbivore-large") priority += 1;
  return priority;
}

export function getSpeciesRenderProfile(species: SpeciesDefinition): SpeciesRenderProfile {
  const hintedAssetPath = species.renderHints?.spriteAssetPath ?? null;
  const assetPath = hintedAssetPath || SPECIES_ASSET_PATHS[species.id] || null;
  return {
    speciesId: species.id,
    assetPath,
    fallbackShape: fallbackShapeFor(species),
    baseScale: species.renderHints?.baseScale ?? baseScaleFor(species),
    heightOffset: heightOffsetFor(species),
    billboardMode: species.category === "bird" ? "camera-facing" : "yaw-only",
    habitatPlacement: habitatPlacementFor(species),
    labelPriority: labelPriorityFor(species),
    displayColor: undefined,
    silhouetteStyle: assetPath ? "field-guide" : undefined,
  };
}
