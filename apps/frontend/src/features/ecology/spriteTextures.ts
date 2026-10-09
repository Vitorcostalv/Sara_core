import * as THREE from "three";

const textures = new Map<string, Promise<THREE.Texture | null>>();

/** Share pending loads as well as completed textures across all animals. */
export function loadSpriteTexture(assetPath: string): Promise<THREE.Texture | null> {
  const cached = textures.get(assetPath);
  if (cached) return cached;

  const pending = new Promise<THREE.Texture | null>((resolve) => {
    new THREE.TextureLoader().load(
      assetPath,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
  textures.set(assetPath, pending);
  return pending;
}
