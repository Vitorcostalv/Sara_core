import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sealConfig } from "./portable-vault.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "win32") throw new Error("Este pacote inclui o runtime para Windows. Gere em um PC Windows.");
const outputRoot = join(root, "artifacts", "portable");
mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(join(outputRoot, `Sara-Core-Windows-${process.arch}-`));
const require = createRequire(join(root, "apps/backend/package.json"));
const backendPackage = JSON.parse(readFileSync(join(root, "apps/backend/package.json"), "utf8"));
const deps = Object.fromEntries(Object.keys(backendPackage.dependencies).map((name) => [name, require(`${name}/package.json`).version]));
writeFileSync(join(output, "package.json"), JSON.stringify({ name: "sara-core-portable", version: "0.1.0", private: true, dependencies: deps }, null, 2));
for (const app of ["backend", "frontend"]) {
  const dist = join(root, "apps", app, "dist");
  if (!existsSync(dist)) throw new Error(`Build ausente: ${app}`);
  cpSync(dist, join(output, "apps", app, "dist"), { recursive: true, filter: (path) => !path.endsWith(".test.js") });
}
// This manifest gives the launcher a stable createRequire location; it is not another workspace install.
writeFileSync(join(output, "apps/backend/package.json"), JSON.stringify({ name: "sara-core-portable-backend", private: true }));
mkdirSync(join(output, "scripts"), { recursive: true });
for (const file of ["start-local.mjs", "local-gateway.mjs", "portable-vault.mjs"]) cpSync(join(root, "scripts", file), join(output, "scripts", file));
cpSync(join(root, "database"), join(output, "database"), { recursive: true });
mkdirSync(join(output, "runtime"));
cpSync(process.execPath, join(output, "runtime/node.exe"));
const install = spawnSync("npm install --omit=dev --ignore-scripts --no-audit --no-fund", { cwd: output, shell: true, stdio: "inherit" });
if (install.status !== 0) throw new Error("Falha na instalação das dependências do pacote portátil.");

// Include editable sources without Git history, local secrets, logs or generated binaries.
const listed = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
if (listed.status !== 0) throw new Error("Falha ao listar o código para backup.");
for (const file of new Set(listed.stdout.split("\0").filter(Boolean))) {
  if (!/^(apps\/|packages\/|database\/|scripts\/|docs\/|package(?:-lock)?\.json$|README\.md$|eslint\.config\.mjs$|\.gitignore$)/.test(file)) continue;
  if (/(^|\/)\.env(?:\.|$)|(^|\/)node_modules\/|(^|\/)dist\/|docs\/private\/|\.local\.md$|\.(?:zip|apk|aab|jks|keystore|exe|db|log)$|public\/models\//i.test(file)) continue;
  if (!existsSync(join(root, file))) continue;
  const dest = join(output, "source", file);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(root, file), dest);
}
cpSync(join(root, "docs/deployment/another-pc.md"), join(output, "LEIA-ME.md"));
const envPath = join(root, ".env");
let recoveryFile = null;
if (existsSync(envPath)) {
  const env = require("dotenv").parse(readFileSync(envPath));
  const names = ["DATABASE_URL", "DIRECT_DATABASE_URL", "LLM_PROVIDER", "LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL", "LLM_TIMEOUT_MS", "API_JSON_MAX_BYTES"];
  const config = Object.fromEntries(names.filter((name) => env[name]).map((name) => [name, env[name]]));
  if (config.DATABASE_URL) {
    const password = randomBytes(32).toString("base64url");
    writeFileSync(join(output, "config.sealed.json"), JSON.stringify(sealConfig(config, password)));
    const privateDir = join(root, "docs/private");
    mkdirSync(privateDir, { recursive: true });
    recoveryFile = join(privateDir, `${output.split(/[\\/]/).pop()}-recovery.txt`);
    writeFileSync(recoveryFile, password + "\n", { mode: 0o600 });
    // Check every shipped text file for actual secrets without printing their values.
    const secrets = ["DATABASE_URL", "DIRECT_DATABASE_URL", "LLM_API_KEY", "API_AUTH_KEY"].filter((name) => env[name]?.length >= 12).map((name) => env[name]);
    function inspect(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) inspect(path);
        else if (/\.(?:json|js|mjs|ts|tsx|html|md|txt|sql|bat|ps1)$/.test(path)) {
          const text = readFileSync(path, "utf8");
          if (secrets.some((secret) => text.includes(secret))) throw new Error(`Credencial em texto aberto detectada: ${path}`);
        }
      }
    }
    inspect(output);
  }
}
writeFileSync(join(output, "Iniciar-Sara.bat"), '@echo off\r\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" "%~dp0scripts\\start-local.mjs"\r\npause\r\n');
writeFileSync(join(output, ".env.template"), "DATABASE_URL=\nLLM_PROVIDER=disabled\nLLM_API_KEY=\nSARA_LOCAL_PORT=5190\n");
const zip = output + ".zip";
const archived = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", "Compress-Archive -LiteralPath $env:SARA_PORTABLE_DIR -DestinationPath $env:SARA_PORTABLE_ZIP -CompressionLevel Optimal"], {
  env: { ...process.env, SARA_PORTABLE_DIR: output, SARA_PORTABLE_ZIP: zip }, encoding: "utf8",
});
if (archived.status !== 0) throw new Error("Falha ao compactar o pacote. A pasta pronta foi preservada.");
const sha256 = createHash("sha256").update(readFileSync(zip)).digest("hex");
writeFileSync(zip + ".sha256", sha256 + "\n");
writeFileSync(join(outputRoot, "latest.json"), JSON.stringify({ folder: output, zip, recoveryFile, sha256 }, null, 2));
console.log(`Pacote: ${zip}\nSHA256: ${sha256}\nChave de recuperação (guardar separadamente): ${recoveryFile ?? "Não gerada: configure .env no novo PC."}`);
