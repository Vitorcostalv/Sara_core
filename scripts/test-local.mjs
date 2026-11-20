import EmbeddedPostgres from "embedded-postgres";
import { mkdir, mkdtemp, readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testRoot = resolve(root, ".tmp", "test-postgres");
await mkdir(testRoot, { recursive: true });
const directory = await mkdtemp(resolve(testRoot, "run-"));
const location = relative(testRoot, directory);
if (location.startsWith("..") || isAbsolute(location)) throw new Error("Test database escaped workspace");
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((done) => socket.close(done));
const password = randomBytes(24).toString("hex");
const testEnv = {
  ...process.env,
  DATABASE_URL: `postgresql://sara_test:${password}@127.0.0.1:${port}/sara_test`,
  DIRECT_DATABASE_URL: `postgresql://sara_test:${password}@127.0.0.1:${port}/sara_test`,
  DATABASE_SSL_MODE: "disable", DATABASE_SSL: "false", NODE_ENV: "test",
  AUTH_MODE: "disabled", LLM_PROVIDER: "disabled", LLM_API_KEY: "", LOG_LEVEL: "silent",
  LLM_RENDER_ENABLED: "false", LLM_RENDER_API_KEY: "", LLM_RENDER_BASE_URL: "http://127.0.0.1:1/v1",
};
const database = new EmbeddedPostgres({
  databaseDir: directory, user: "sara_test", password, port, persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {}, onError: () => {},
});

async function run(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env: testEnv, stdio: "inherit", windowsHide: true });
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(`Test command failed (${code}): ${args[0]}`);
}

async function testsBelow(directoryPath) {
  const files = [];
  for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
    const path = resolve(directoryPath, entry.name);
    if (entry.isDirectory()) files.push(...await testsBelow(path));
    else if (entry.name.endsWith(".test.ts")) files.push(path);
  }
  return files.sort();
}

try {
  console.log("Criando PostgreSQL exclusivo de testes em 127.0.0.1 (produção não é acessada).");
  await database.initialise();
  await database.start();
  await database.createDatabase("sara_test");
  await run([resolve(root, "node_modules/typescript/bin/tsc"), "-p", "packages/shared-types/tsconfig.json"]);
  const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
  await run([tsx, "apps/backend/src/database/migrate-postgres.ts"]);
  await run([tsx, "apps/backend/src/database/seed-postgres.ts"]);
  if (!process.argv.includes("--browser-only")) {
    await run([tsx, "--test", ...await testsBelow(resolve(root, "apps/backend/src"))]);
    await run([resolve(root, "node_modules/vitest/vitest.mjs"), "run"], resolve(root, "apps/frontend"));
  }
  if (process.argv.includes("--browser") || process.argv.includes("--browser-only")) await run(["scripts/browser-smoke.mjs"]);
  console.log("Banco local, migrations, seeds, backend e frontend: verificações concluídas.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await database.stop();
  console.log("PostgreSQL de testes encerrado. Dados locais retidos em .tmp/test-postgres (ignorado pelo Git).");
}
