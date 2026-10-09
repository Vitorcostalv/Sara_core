import { afterEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { loadSpriteTexture } from "../features/ecology/spriteTextures";

afterEach(() => vi.restoreAllMocks());

it("loads each sprite only once when many animals request it concurrently", async () => {
  let complete: ((texture: THREE.Texture) => void) | undefined;
  const load = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((_path, onLoad) => {
    complete = onLoad;
    return new THREE.Texture();
  });
  const first = loadSpriteTexture("/test-shared-sprite.png");
  const second = loadSpriteTexture("/test-shared-sprite.png");
  expect(second).toBe(first);
  expect(load).toHaveBeenCalledTimes(1);
  const texture = new THREE.Texture();
  complete!(texture);
  expect(await first).toBe(texture);
  expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  expect(await loadSpriteTexture("/test-shared-sprite.png")).toBe(texture);
  expect(load).toHaveBeenCalledTimes(1);
});

it("returns the geometric fallback after a failed sprite load", async () => {
  const load = vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((_path, _onLoad, _progress, onError) => {
    onError!(new Error("Missing sprite"));
    return new THREE.Texture();
  });
  expect(await loadSpriteTexture("/test-missing-sprite.png")).toBeNull();
  expect(await loadSpriteTexture("/test-missing-sprite.png")).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
});
