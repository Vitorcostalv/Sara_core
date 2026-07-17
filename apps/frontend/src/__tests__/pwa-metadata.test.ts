import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");

function readPublic(rel: string): string {
  return readFileSync(join(publicDir, rel), "utf-8");
}

describe("PWA manifest", () => {
  const manifest = JSON.parse(readPublic("manifest.webmanifest")) as {
    name: string;
    short_name: string;
    start_url: string;
    display: string;
    icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };

  it("declares the required core fields", () => {
    expect(manifest.name).toBe("Sara Core");
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe("standalone");
  });

  it("declares icons that exist on disk, including a maskable icon", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const rel = icon.src.replace(/^\//, "");
      expect(existsSync(join(publicDir, rel)), `missing icon ${icon.src}`).toBe(true);
    }
    expect(manifest.icons.some((i) => (i.purpose ?? "").includes("maskable"))).toBe(true);
  });
});

describe("service worker cache strategy", () => {
  const sw = readPublic("sw.js");

  it("precaches the app shell entry points and offline demo assets", () => {
    // Offline scenario assets used by the shipped snapshots must be in the precache list.
    for (const asset of [
      "/ecology",
      "/manifest.webmanifest",
      "/textures/waternormals.jpg",
      "/fauna/capivara.png",
      "/fauna/onca-pintada.png",
      "/fauna/invasor-javali.png",
    ]) {
      expect(sw.includes(asset), `sw.js precache is missing ${asset}`).toBe(true);
    }
  });

  it("never intercepts API traffic (keeps online/offline modes truthful)", () => {
    expect(sw.includes('url.pathname.startsWith("/api/")')).toBe(true);
  });

  it("caches build assets so an offline reload can boot the SPA (not just the HTML shell)", () => {
    // Regression guard: the old SW fetched hashed /assets/*.js without ever storing them,
    // which left an offline reload with a blank screen. cacheFirst must persist them.
    expect(sw.includes("cacheFirst")).toBe(true);
    expect(sw.includes("cache.put")).toBe(true);
  });

  it("bumps the cache version so an old cached release is replaced on update", () => {
    const match = sw.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/v\d+$/);
  });
});
