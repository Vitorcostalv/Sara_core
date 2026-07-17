// Post-build hygiene: Vite copies everything under apps/frontend/public/ into dist/.
// `public/models/` is a dead, git-ignored local folder (runtime GLB usage was removed and
// nothing references /models/ anymore). On some machines it also accumulates large stray
// local files (installers, PDFs) that would otherwise be bundled into the production build,
// the demo pack, and the Capacitor APK — inflating them by hundreds of MB.
//
// This prunes only the *built copy* under dist/. It never touches the source public/ folder,
// so any local files the user keeps there are left exactly as they are.
import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

let root = process.cwd();
if (!existsSync(join(root, "apps", "frontend")) && existsSync(join(root, "..", "..", "apps", "frontend"))) {
  root = join(root, "..", "..");
}

const DEAD_DIRS = ["apps/frontend/dist/models"];

for (const rel of DEAD_DIRS) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  let sizeNote = "";
  try {
    if (statSync(abs).isDirectory()) sizeNote = "";
  } catch {
    // ignore
  }
  rmSync(abs, { recursive: true, force: true });
  console.log(`Pruned dead build directory from dist: ${rel}${sizeNote}`);
}
