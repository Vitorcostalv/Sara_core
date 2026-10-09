import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createLocalGateway } from "./local-gateway.mjs";
import { sealConfig, openConfig } from "./portable-vault.mjs";

async function fixture(t) {
  const distDir = mkdtempSync(join(tmpdir(), "sara-local-test-"));
  writeFileSync(join(distDir, "index.html"), "<html><head></head><body>Sara</body></html>");
  writeFileSync(join(distDir, ".env"), "SHOULD_NOT_BE_SERVED=true");
  const requests = [];
  const backend = http.createServer((req, res) => {
    requests.push({ path: req.url, apiKey: req.headers["x-sara-api-key"] });
    res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
  });
  await new Promise((ready) => backend.listen(0, "127.0.0.1", ready));
  const gateway = createLocalGateway({ distDir, backendPort: backend.address().port, apiKey: "test-private-key" });
  await new Promise((ready) => gateway.listen(0, "127.0.0.1", ready));
  t.after(async () => {
    await Promise.all([gateway, backend].map((server) => new Promise((done) => { server.close(done); server.closeAllConnections(); })));
    assert.equal(dirname(distDir), resolve(tmpdir()));
    rmSync(distDir, { recursive: true, force: true });
  });
  return { url: `http://127.0.0.1:${gateway.address().port}`, requests };
}

test("local gateway keeps API credentials server-side", async (t) => {
  const { url, requests } = await fixture(t);
  const response = await fetch(`${url}/api/v1/ecology/coverage`);
  assert.equal(response.status, 200);
  assert.equal(requests[0].apiKey, "test-private-key");
  assert.equal((await response.text()).includes("test-private-key"), false);
  const config = await (await fetch(`${url}/runtime-config.js`)).text();
  assert.equal(config.includes("test-private-key"), false);
  assert.match(config, /apiBaseUrl:"\/api\/v1"/);
});

test("local gateway rejects hostile hosts and browser origins before reaching the API", async (t) => {
  const { url, requests } = await fixture(t);
  for (const headers of [{ Host: "attacker.test" }, { Origin: "https://attacker.test" }, { "Sec-Fetch-Site": "cross-site" }]) {
    // Node fetch normalizes Host; use raw HTTP to exercise forged Host headers.
    const status = await new Promise((done, reject) => {
      http.get(`${url}/api/v1/health`, { headers }, (response) => {
        response.resume();
        done(response.statusCode);
      }).on("error", reject);
    });
    assert.equal(status, 403, JSON.stringify(headers));
  }
  assert.equal(requests.length, 0);
});

test("local gateway only accepts JSON POSTs and approved API methods", async (t) => {
  const { url, requests } = await fixture(t);
  assert.equal((await fetch(`${url}/api/v1/ecology/fauna`, { method: "POST", body: "biomes=cerrado" })).status, 415);
  assert.equal((await fetch(`${url}/api/v1/ecology/fauna`, { method: "DELETE" })).status, 405);
  assert.equal((await fetch(`${url}/api/v1/ecology/fauna`, { method: "POST", headers: { "Content-Type": "application/json", Origin: url }, body: '{"biomes":["cerrado"]}' })).status, 200);
  assert.equal(requests.length, 1);
});

test("local gateway serves the SPA with public runtime config and denies private files", async (t) => {
  const { url } = await fixture(t);
  const html = await (await fetch(`${url}/ecology`)).text();
  assert.match(html, /<head><script src="\/runtime-config.js"><\/script>/);
  for (const path of ["/.env", "/config.sealed.json", "/%2e%2e%2f.env", "/missing.js"]) {
    assert.equal((await fetch(url + path)).status, 404, path);
  }
});

test("portable config decrypts only with its separate recovery key", () => {
  const config = { DATABASE_URL: "postgresql://private-user:private-password@example.test/db" };
  const vault = sealConfig(config, "test-recovery-key");
  assert.equal(JSON.stringify(vault).includes(config.DATABASE_URL), false);
  assert.deepEqual(openConfig(vault, "test-recovery-key"), config);
  assert.throws(() => openConfig(vault, "wrong-key"));
  const changed = Buffer.from(vault.data, "base64");
  changed[0] ^= 1;
  assert.throws(() => openConfig({ ...vault, data: changed.toString("base64") }, "test-recovery-key"));
});
