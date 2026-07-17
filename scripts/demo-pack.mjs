import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, ".tmp", "demo-pack");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(root, "apps", "frontend", "dist"), join(outDir, "frontend-dist"), { recursive: true });
cpSync(join(root, "docs", "demo", "emergency-demo-checklist.md"), join(outDir, "emergency-demo-checklist.md"));
cpSync(join(root, "docs", "usage", "demo-prompts.md"), join(outDir, "demo-prompts.md"));
writeFileSync(
  join(outDir, "build-metadata.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), app: "Sara Core", mode: "portable-demo" }, null, 2)}\n`,
);

console.log(`Demo pack generated at ${outDir}`);
