import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalGateway } from "./local-gateway.mjs";
import { askRecoveryKey, openConfig } from "./portable-vault.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "apps/backend/package.json"));
require("dotenv").config({ path: resolve(root, ".env") });
if (!process.env.DATABASE_URL?.trim() && existsSync(resolve(root, "config.sealed.json"))) {
  try {
    const config = openConfig(JSON.parse(readFileSync(resolve(root, "config.sealed.json"), "utf8")), await askRecoveryKey());
    for (const [key, value] of Object.entries(config)) if (typeof value === "string") process.env[key] = value;
  } catch {
    console.error("Chave incorreta ou configuração criptografada inválida. Nenhuma credencial foi carregada.");
    process.exit(1);
  }
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("Configure DATABASE_URL no arquivo .env desta pasta antes de iniciar. As credenciais ficam somente neste PC.");
  process.exit(1);
}
if (!existsSync(resolve(root, "apps/backend/dist/app.js")) || !existsSync(resolve(root, "apps/frontend/dist/index.html"))) {
  console.error("Build não encontrado. Execute npm run build antes de iniciar.");
  process.exit(1);
}
// Harden this launcher regardless of development settings copied from another PC.
process.env.NODE_ENV = "production";
process.env.AUTH_MODE = "api-key";
process.env.API_AUTH_KEY = randomBytes(32).toString("hex");
process.env.BACKEND_HOST = "127.0.0.1";
process.env.TRUST_PROXY = "false";
process.env.DATABASE_SSL_MODE = "verify-full";
const publicPort = Number(process.env.SARA_LOCAL_PORT ?? 5190);
if (!Number.isInteger(publicPort) || publicPort < 1 || publicPort > 65535) {
  console.error("SARA_LOCAL_PORT deve ser uma porta válida entre 1 e 65535.");
  process.exit(1);
}
process.env.CORS_ORIGINS = `http://127.0.0.1:${publicPort},http://localhost:${publicPort}`;
const { createApp } = require(resolve(root, "apps/backend/dist/app.js"));
const { closeDatabase } = require(resolve(root, "apps/backend/dist/database/postgres.js"));
const backend = createApp().listen(0, "127.0.0.1");
backend.on("error", () => { console.error("Falha ao iniciar a API local."); process.exit(1); });
await new Promise((ready) => backend.once("listening", ready));
const gateway = createLocalGateway({
  distDir: resolve(root, "apps/frontend/dist"),
  backendPort: backend.address().port,
  apiKey: process.env.API_AUTH_KEY,
});
gateway.on("error", () => {
  console.error(`Não foi possível usar a porta ${publicPort}. Defina outra SARA_LOCAL_PORT; nenhum processo será encerrado automaticamente.`);
  process.exit(1);
});
gateway.listen(publicPort, "127.0.0.1", () => console.log(`Sara Core pronto: http://127.0.0.1:${publicPort}/ecology\nMantenha esta janela aberta. API restrita a este PC; credenciais não são enviadas ao navegador.`));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  gateway.close();
  backend.close();
  gateway.closeAllConnections();
  backend.closeAllConnections();
  await closeDatabase();
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
