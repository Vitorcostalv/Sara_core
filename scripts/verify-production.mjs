import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { syntheticForecastExample } = createRequire(import.meta.url)("@sara/shared-types");

const configured = process.argv[2] ?? process.env.SARA_API_BASE_URL;
if (!configured) {
  console.error("Uso: npm run verify:production -- https://sara-core-one.vercel.app [--llm]");
  process.exit(1);
}
const url = new URL(configured);
assert.ok(["http:", "https:"].includes(url.protocol) && !url.username && !url.password, "Use URL HTTP(S) sem credenciais.");
url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api\/v1$/, "")}/api/v1`;
url.search = ""; url.hash = "";
const headers = { "content-type": "application/json", ...(process.env.SARA_API_KEY ? { "x-sara-api-key": process.env.SARA_API_KEY } : {}) };
async function call(path, body) {
  const response = await fetch(`${url.href}${path}`, { method: body ? "POST" : "GET", headers,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180_000), cache: "no-store" });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response.json();
}

try {
  const health = await call("/health");
  assert.equal(health.status, "ok", "Banco não está saudável.");
  if (process.env.SARA_EXPECTED_COMMIT) assert.equal(health.deployment?.commit, process.env.SARA_EXPECTED_COMMIT, "SHA servido diferente do commit esperado.");
  assert.equal(health.capabilities?.forecastModel, "observational-log-trend-v1", "A versão nova ainda não está publicada.");
  const forecast = (await call("/ecology/forecast", syntheticForecastExample())).data;
  assert.equal(forecast.source.kind, "synthetic");
  assert.equal(forecast.species[0].forecast.length, 14);
  assert.ok(forecast.species[0].validation.beatsPersistence);
  console.log("OK: saúde, versão e previsão com dados sintéticos; nenhuma observação foi salva no banco.");
  if (process.argv.includes("--llm")) {
    assert.ok(health.capabilities.llmConfigured, "LLM não configurada no servidor.");
    const scenario = (await call("/ecology/invasive", { speciesText: "leão", locationText: "cerrado", width: 12, height: 10, seed: 41 })).data;
    assert.equal(scenario.predationReasoning.source, "llm", "A resposta caiu no fallback; a integração real da LLM não passou.");
    assert.deepEqual([...scenario.predationReasoning.actionIds].sort(), scenario.predationDynamics.actions.map((a) => a.id).sort());
    console.log("OK: LLM real respondeu ao cenário e respeitou o conjunto de ações do motor.");
  } else console.log("LLM real não foi chamada. Use --llm para verificar o provedor (há consumo da API configurada).");
} catch (error) {
  console.error(`Verificação falhou: ${error.message}`);
  process.exitCode = 1;
}
