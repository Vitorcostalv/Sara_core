import { existsSync, readFileSync, statSync } from "node:fs";
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
const entryHtml = readFileSync(join(root, "apps/frontend/dist/index.html"), "utf8");
for (const match of entryHtml.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)) {
  files.push(`apps/frontend/dist${match[1]}`);
}
let total = 0;

for (const file of new Set(files)) {
  total += statSync(join(root, file)).size;
}

const mb = (total / 1024 / 1024).toFixed(2);
const budgetMb = (budgetBytes / 1024 / 1024).toFixed(2);
console.log(`Sara Core PWA precache estimate: ${mb} MB / ${budgetMb} MB budget`);

if (total > budgetBytes) {
  throw new Error("PWA precache budget exceeded. Reduce critical assets before the demo build.");
}
