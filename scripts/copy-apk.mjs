// Copy the freshly built debug APK into a git-ignored local release folder so it is easy to
// grab / share for a physical-device test, without ever committing the binary.
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

let root = process.cwd();
if (!existsSync(join(root, "apps", "frontend")) && existsSync(join(root, "..", "..", "apps", "frontend"))) {
  root = join(root, "..", "..");
}

const apk = join(root, "apps", "frontend", "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const outDir = join(root, ".tmp", "android-release");

if (!existsSync(apk)) {
  console.error(`No debug APK found at:\n  ${apk}\nBuild it first (npm run apk:debug -w @sara/frontend).`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "sara-core-debug.apk");
copyFileSync(apk, dest);
console.log(`Copied debug APK -> ${dest}`);
