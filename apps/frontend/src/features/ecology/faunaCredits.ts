import { FAUNA_ASSET_MANIFEST } from "./faunaAssetManifest";

export interface ModelCredit {
  model: string;
  author: string;
  license: "CC0" | "CC-BY" | "CC-BY-NC";
  sourceUrl: string;
}

// Derived from the asset manifest so attribution always matches the assets actually shipped.
// One entry per (author, source) pair to keep the credits screen concise.
export const FAUNA_CREDITS: ModelCredit[] = (() => {
  const seen = new Map<string, ModelCredit>();
  for (const asset of Object.values(FAUNA_ASSET_MANIFEST)) {
    const key = `${asset.author}|${asset.source}|${asset.license}`;
    if (!seen.has(key)) {
      seen.set(key, {
        model: asset.source,
        author: asset.author,
        license: asset.license,
        sourceUrl: asset.sourceUrl,
      });
    }
  }
  return Array.from(seen.values());
})();
