import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createServer } from "node:net";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// The parent runner supplies only a fresh local PostgreSQL connection.
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/sara_test");
assert.equal(process.env.LLM_PROVIDER, "disabled");
const root = process.cwd();
const artifacts = resolve(root, ".tmp/verification");
await mkdir(artifacts, { recursive: true });
async function freePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}
const backendPort = await freePort();
const frontendPort = await freePort();
const api = `http://127.0.0.1:${backendPort}/api/v1`;
const web = `http://127.0.0.1:${frontendPort}`;
const environment = { ...process.env, BACKEND_HOST: "127.0.0.1", BACKEND_PORT: String(backendPort),
  CORS_ORIGINS: web, CORS_ORIGIN: web, VITE_API_BASE_URL: api };
const services = [];
let browser;
let page;
const errors = [];
const failures = [];
const diagnostics = [];
function launch(args, cwd) {
  const child = spawn(process.execPath, args, { cwd, env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (data) => { output = (output + data).slice(-6000); });
  child.stderr.on("data", (data) => { output = (output + data).slice(-6000); });
  services.push({ child, output: () => output });
}
async function ready(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch { /* startup */ }
    await delay(150);
  }
  throw new Error(`Local server did not start: ${new URL(url).pathname}`);
}
try {
  launch(["--import", "tsx", "apps/backend/src/server.ts"], root);
  launch([resolve(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(frontendPort)], resolve(root, "apps/frontend"));
  await Promise.all([ready(`${api}/health/ping`), ready(web)]);
  // Exercise the exact read-only release verifier against the isolated API.
  const verifier = spawn(process.execPath, ["--import", "tsx", "scripts/verify-production.mjs", api],
    { cwd: root, env: environment, windowsHide: true, stdio: "inherit" });
  const [verifierCode] = await once(verifier, "exit");
  assert.equal(verifierCode, 0, "Release verifier failed against local API");
  browser = await chromium.launch({ channel: "msedge", headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
  await context.addInitScript((apiUrl) => {
    localStorage.setItem("sara-core.api-base-url", apiUrl);
    localStorage.setItem("sara-core.demo-flow-dismissed", "true");
    localStorage.setItem("sara-core.performance-profile", "light");
  }, api);
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", async (message) => {
    if (message.text().startsWith("[fauna:diagnostic] summary")) {
      const state = await message.args()[1]?.jsonValue().catch(() => null);
      if (state) diagnostics.push({ time: Date.now(), ...state });
    }
  });
  const scenePopulation = async (id, expected, after) => {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (diagnostics.some((state) => state.time > after && state.preyCounts?.[id] === expected)) return;
      await delay(100);
    }
    throw new Error(`Scene population did not match projection for ${id}: expected ${expected}`);
  };
  page.on("response", (response) => { if (response.status() >= 400) failures.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  // A failed cold start must not silently load a cached demonstration.
  const failedStart = await context.newPage();
  await failedStart.route("**/ecology/simulate-prompt", route => route.abort("failed"));
  await failedStart.goto(`${web}/ecology`);
  await failedStart.locator(".terrain-ai-error").waitFor();
  assert.equal(await failedStart.getByTestId("offline-disclosure").count(), 0);
  await failedStart.getByRole("button", {name:"Abrir demo offline",exact:true}).click();
  await failedStart.getByTestId("offline-disclosure").waitFor();
  await failedStart.close();

  const opening = page.waitForResponse(r => r.url() === `${api}/ecology/simulate-prompt` && r.request().method() === "POST");
  await page.goto(`${web}/ecology`);
  const openingData = (await (await opening).json()).data;
  assert.equal(openingData.kind, "ecosystem");
  await page.waitForFunction(() => !document.querySelector(".terrain-ai-prompt__input")?.disabled);
  assert.equal(await page.getByTestId("offline-disclosure").count(), 0);
  assert.equal(await page.getByTestId("preview-notice").count(), 0);
  await page.locator(".terrain-ai-prompt__input").fill("Simule uma invasão de javalis no Cerrado");
  const fromDescription = page.waitForResponse(r => r.url() === `${api}/ecology/simulate-prompt` && r.request().method() === "POST");
  await page.getByRole("button", {name:"Gerar ecossistema 3D",exact:true}).click();
  const introduced = (await (await fromDescription).json()).data;
  assert.equal(introduced.kind, "invasive");
  assert.equal(introduced.result.invaderProfile.displayName, "Javali");
  await page.locator(".invasive-phase-tab").last().waitFor();
  assert.equal(await page.locator("#invasive-species-select").inputValue(), "javali");
  assert.equal(await page.locator("#invasive-location-select").inputValue(), "cerrado");
  assert.equal(await page.getByTestId("offline-disclosure").count(), 0);
  await page.screenshot({path:resolve(artifacts,"invasion-from-description.png"),fullPage:true});
  await page.getByText("Previsão com observações", { exact: true }).click();
  await page.locator("#forecast-observations").fill("{invalid-json");
  await page.getByRole("button", { name: "Gerar previsão experimental" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByRole("button", { name: "Carregar exemplo sintético" }).click();
  const forecastResponse = page.waitForResponse((r) => r.url() === `${api}/ecology/forecast` && r.request().method() === "POST");
  await page.getByRole("button", { name: "Gerar previsão experimental" }).click();
  const observational = (await (await forecastResponse).json()).data;
  assert.equal(observational.modelVersion, "observational-log-trend-v1");
  assert.equal(observational.status, "insufficient-evidence");
  assert.ok(observational.species[0].validation.beatsPersistence);
  await page.getByRole("button", { name: "Exportar previsão e avaliação" }).waitFor();
  await page.locator('[data-testid="forecast-panel"]').screenshot({ path: resolve(artifacts, "forecast-local.png") });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar previsão e avaliação" }).click();
  await (await downloadPromise).saveAs(resolve(artifacts, "forecast-export.json"));
  assert.deepEqual(JSON.parse(await readFile(resolve(artifacts, "forecast-export.json"), "utf8")), observational);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-testid="forecast-panel"]').scrollIntoViewIfNeeded();
  const panelBox = await page.locator('[data-testid="forecast-panel"]').boundingBox();
  assert.ok(panelBox && panelBox.width <= 390, "Forecast panel must fit a phone viewport");
  await page.screenshot({ path: resolve(artifacts, "forecast-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByText("Previsão com observações", { exact: true }).click();
  await page.locator("#invasive-species-select").selectOption("leao");
  const responsePromise = page.waitForResponse((r) => r.url() === `${api}/ecology/invasive` && r.request().method() === "POST", { timeout: 30_000 });
  await page.getByRole("button", { name: "Simular cenário selecionado" }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  const { data } = await response.json();
  await page.locator(".invasive-phase-tab").last().waitFor({ timeout: 30_000 });
  await page.locator("canvas").first().waitFor();
  assert.ok(data.nativeSpecies.length > 0);
  assert.equal(data.predationReasoning.source, "rules");
  const finalSelectedAt = Date.now();
  await page.locator(".invasive-phase-tab").last().click();
  assert.equal(await page.locator(".invasive-phase-tab").last().getAttribute("aria-pressed"), "true");
  const shown = await page.locator(".invasive-delta-row--invader .invasive-delta-row__value").innerText();
  assert.ok(shown.trim().startsWith(String(data.phases.at(-1).invaderPop)));
  await scenePopulation(data.invader.id, data.phases.at(-1).invaderPop, finalSelectedAt);
  await delay(6500); // exceeds the old five-second respawn interval
  assert.equal(diagnostics.at(-1).preyCounts[data.invader.id], data.phases.at(-1).invaderPop);
  await page.locator("canvas").first().screenshot({ path: resolve(artifacts, "scene-local.png") });
  await page.screenshot({ path: resolve(artifacts, "predation-local.png"), fullPage: true });
  const restoredAt = Date.now();
  await page.locator(".invasive-phase-tab").first().click();
  assert.equal(await page.locator(".invasive-phase-tab").first().getAttribute("aria-pressed"), "true");
  await scenePopulation(data.invader.id, data.phases[0].invaderPop, restoredAt);
  // A second scenario exercises the failure path through the real UI and API.
  await page.locator("#invasive-location-select").selectOption("antartida");
  const incompatibleResponse = page.waitForResponse((r) => r.url() === `${api}/ecology/invasive` && r.request().method() === "POST");
  await page.getByRole("button", { name: "Simular cenário selecionado" }).click();
  const incompatible = (await (await incompatibleResponse).json()).data;
  assert.equal(incompatible.invaderProfile.survives, false);
  assert.equal(incompatible.phases.at(-1).invaderPop, 0);
  await page.locator(".invasive-phase-tab").last().click();
  await page.screenshot({ path: resolve(artifacts, "incompatible-local.png"), fullPage: true });
  await page.getByRole("button",{name:/Explorar/}).click();
  await page.getByRole("button",{name:/^Dados/}).click();
  const catalogResponse=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith("/ecology/species"));
  await page.getByRole("button",{name:"Espécies",exact:true}).click();
  const catalog=(await (await catalogResponse).json());
  assert.ok(catalog.meta.total>100);
  await page.getByTestId("species-catalog-summary").getByText(`${catalog.meta.total} espécies no catálogo completo`,{exact:true}).waitFor();
  const nextSpecies=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith("/ecology/species")&&new URL(r.url()).searchParams.get("page")==="2");
  await page.getByRole("button",{name:"Próxima",exact:true}).click();
  assert.equal((await nextSpecies).status(),200);
  await page.getByLabel("Buscar espécie por nome comum ou científico").fill("puma-andino");
  const foundSpecies=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith("/ecology/species")&&new URL(r.url()).searchParams.get("search")==="puma-andino");
  await page.getByRole("button",{name:"Buscar",exact:true}).click();
  const found=(await (await foundSpecies).json());assert.equal(found.meta.total,1);assert.equal(found.meta.page,1);
  await page.getByText("Puma concolor",{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  const catalogBox=await page.locator(".catalog-grid").boundingBox();assert.ok(catalogBox&&catalogBox.width<=390);
  await page.screenshot({path:resolve(artifacts,"species-catalog-mobile.png"),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole("button",{name:"Cobertura",exact:true}).click();
  await page.getByText("Espécies no catálogo completo",{exact:true}).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await writeFile(resolve(artifacts, "browser-result.json"), JSON.stringify({
    checked: ["local API and PostgreSQL", "observational forecast and export", "invalid JSON recovery", "3D canvas", "phase population", "phase reversal", "incompatible habitat", "no JS exceptions or HTTP errors"],
    errors, failures, sceneCountsChecked: true, noRespawnAfter6500ms: true,
    outcomes: [data.predationDynamics.outcome, incompatible.predationDynamics.outcome],
  }, null, 2));
  console.log("Browser OK: API local, canvas 3D, fases reversíveis e fracasso em habitat incompatível; sem erros de JS/HTTP.");
} catch (error) {
  await page?.screenshot({ path: resolve(artifacts, "failure.png"), fullPage: true }).catch(() => {});
  if (page) await writeFile(resolve(artifacts, "failure.html"), await page.content());
  console.error(JSON.stringify({ errors, failures }));
  console.error(services.map((service) => service.output()).join("\n"));
  throw error;
} finally {
  await browser?.close();
  await Promise.all(services.map(async ({ child }) => {
    if (child.exitCode !== null) return;
    const closed = once(child, "exit");
    child.kill("SIGTERM");
    await closed;
  }));
}
