import type { FaunaCategory } from "../../services/api/ecology";
import { FAUNA_ASSET_MANIFEST } from "./faunaAssetManifest";

export interface FaunaModelDef {
  file: string;
  scaleFactor: number;
  rotationOffsetY: number;
  animations: {
    idle: string;
    walk: string | null;
    run: string | null;
    attack: string | null;
    flyOrSwim: string | null;
  };
}

// Runtime model table derived from the asset manifest (single source of truth).
export const FAUNA_MODELS: Record<string, FaunaModelDef> = Object.fromEntries(
  Object.entries(FAUNA_ASSET_MANIFEST).map(([key, asset]) => [
    key,
    {
      file: asset.file,
      scaleFactor: asset.scaleFactor,
      rotationOffsetY: asset.rotationOffsetY,
      animations: asset.clips,
    },
  ]),
);

// Category → model keys, inverted from each asset's declared categories.
export const CATEGORY_TO_MODELS: Record<FaunaCategory, string[]> = (() => {
  const index: Record<FaunaCategory, string[]> = {
    "herbivore-large": [],
    "herbivore-small": [],
    "predator-medium": [],
    "predator-large": [],
    bird: [],
    fish: [],
  };
  for (const [key, asset] of Object.entries(FAUNA_ASSET_MANIFEST)) {
    for (const category of asset.categories) index[category].push(key);
  }
  return index;
})();
