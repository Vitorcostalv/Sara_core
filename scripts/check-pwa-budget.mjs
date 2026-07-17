import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

let root = process.cwd();
if (!existsSync(join(root, "apps", "frontend")) && existsSync(join(root, "..", "..", "apps", "frontend"))) {
  root = join(root, "..", "..");
}
const files = [
  "apps/frontend/dist/index.html",
  "apps/frontend/dist/manifest.webmanifest",
  "apps/frontend/dist/sw.js",
  "apps/frontend/dist/sara_core.png",
  "apps/frontend/dist/textures/waternormals.jpg",
  "apps/frontend/dist/fauna/capivara.png",
  "apps/frontend/dist/fauna/onca-pintada.png",
  "apps/frontend/dist/fauna/invasor-javali.png",
];
const budgetBytes = 5 * 1024 * 1024;
let total = 0;

for (const file of files) {
  try {
    total += statSync(join(root, file)).size;
  } catch {
    // Missing optional assets are reported by the build/runtime separately.
  }
}

const mb = (total / 1024 / 1024).toFixed(2);
const budgetMb = (budgetBytes / 1024 / 1024).toFixed(2);
console.log(`Sara Core PWA precache estimate: ${mb} MB / ${budgetMb} MB budget`);

if (total > budgetBytes) {
  throw new Error("PWA precache budget exceeded. Reduce critical assets before the demo build.");
}
