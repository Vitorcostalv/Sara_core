/**
 * Dev-time fauna asset fetcher.
 *
 * Downloads only the manifest entries that declare a `url` whose local GLB is still missing
 * (idempotent — re-running is a no-op once files exist), validates the GLB magic header, and
 * regenerates public/models/fauna/CREDITS.md from the manifest's attribution data.
 *
 * Usage:  npm run models:fetch   (from apps/frontend)
 *
 * Nothing is fetched at runtime in the browser — this is a setup/CI step. If an asset is absent
 * at runtime the app falls back to a procedural impostor (see AnimalEntity.tsx).
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FAUNA_ASSET_MANIFEST } from "../src/features/ecology/faunaAssetManifest";

const here = dirname(fileURLToPath(import.meta.url));
const FAUNA_DIR = resolve(here, "../public/models/fauna");
const GLB_MAGIC = 0x46546c67; // "glTF" little-endian

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isGlb(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === GLB_MAGIC;
}

async function fetchMissingAssets(): Promise<void> {
  await mkdir(FAUNA_DIR, { recursive: true });
  let downloaded = 0;
  let skipped = 0;
  let withoutUrl = 0;

  for (const [key, asset] of Object.entries(FAUNA_ASSET_MANIFEST)) {
    const target = join(FAUNA_DIR, asset.file);

    if (await fileExists(target)) {
      skipped += 1;
      continue;
    }
    if (!asset.url) {
      withoutUrl += 1;
      console.warn(
        `! ${key} (${asset.file}) is missing and has no download URL — runtime uses the procedural fallback.`,
      );
      continue;
    }

    process.stdout.write(`↓ ${key} ← ${asset.url} ... `);
    const response = await fetch(asset.url);
    if (!response.ok) {
      console.log(`FAILED (HTTP ${response.status})`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!isGlb(buffer)) {
      console.log("FAILED (not a GLB)");
      continue;
    }
    await writeFile(target, buffer);
    downloaded += 1;
    console.log("ok");
  }

  console.log(
    `\nDone: ${downloaded} downloaded, ${skipped} already present, ${withoutUrl} missing without URL.`,
  );
}

async function regenerateCredits(): Promise<void> {
  const seen = new Map<string, { author: string; license: string; source: string; sourceUrl: string }>();
  const lines: string[] = [];

  for (const [key, asset] of Object.entries(FAUNA_ASSET_MANIFEST)) {
    lines.push(`- \`${asset.file}\` (${key}) — ${asset.author}, ${asset.license}`);
    const dedupeKey = `${asset.author}|${asset.source}`;
    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, {
        author: asset.author,
        license: asset.license,
        source: asset.source,
        sourceUrl: asset.sourceUrl,
      });
    }
  }

  const sources = Array.from(seen.values())
    .map((s) => `- **${s.source}** — ${s.author} (${s.license}) — ${s.sourceUrl}`)
    .join("\n");

  const content = `# Créditos dos modelos de fauna

Gerado automaticamente por \`npm run models:fetch\`. Não editar à mão — a fonte da verdade é
\`src/features/ecology/faunaAssetManifest.ts\`.

## Fontes

${sources}

## Modelos

${lines.join("\n")}
`;

  await writeFile(join(FAUNA_DIR, "CREDITS.md"), content, "utf8");
  console.log("Regenerated CREDITS.md");
}

async function main(): Promise<void> {
  await fetchMissingAssets();
  await regenerateCredits();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
