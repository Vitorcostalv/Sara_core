// Serve o build do frontend na rede local e mostra um QR code para abrir no celular.
// Um único endereço (http://IP-do-PC:5190) entrega o app e repassa /api/* ao backend,
// então o celular não precisa saber da porta 3333 nem passar pelo CORS.
//
// Com --hotspot o PC também cria a própria rede Wi-Fi (Hotspot móvel do Windows) e um
// primeiro QR code conecta o celular a ela — útil onde a rede isola os aparelhos.
//
// Uso: node scripts/serve-lan.mjs [--port 5190] [--rebuild] [--hotspot] [--no-open]
import { spawn, spawnSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "apps", "frontend", "dist");
const srcDir = join(root, "apps", "frontend", "src");
const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || Number(process.env.LAN_PORT) || 5190;
const backendPort = Number(process.env.BACKEND_PORT) || 3333;
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const isWindows = process.platform === "win32";
const wantsHotspot = args.includes("--hotspot");
// Faixa fixa que o Windows usa no Hotspot móvel (Compartilhamento de Conexão).
const HOTSPOT_PREFIX = "192.168.137.";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
};

// ─── Build ────────────────────────────────────────────────────────────────────

function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

function ensureBuild() {
  const indexHtml = join(distDir, "index.html");
  const stale = existsSync(indexHtml) && newestMtime(srcDir) > statSync(indexHtml).mtimeMs;
  if (existsSync(indexHtml) && !stale && !args.includes("--rebuild")) return;

  console.log(stale ? "Código mudou desde o último build — gerando de novo..." : "Gerando o build do frontend...");
  // Comando como string única: no Windows npm/npx são .cmd e exigem shell.
  const result = spawnSync("npm run build -w @sara/frontend", {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error("Falha no build do frontend.");
    process.exit(1);
  }
}

// ─── Backend ──────────────────────────────────────────────────────────────────

async function backendIsUp() {
  try {
    const response = await fetch(`${backendOrigin}/api/v1/health`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

let backendChild = null;

async function ensureBackend() {
  if (await backendIsUp()) {
    console.log(`Backend já está rodando na porta ${backendPort}.`);
    return;
  }

  console.log("Subindo o backend...");
  mkdirSync(join(root, ".tmp"), { recursive: true });
  const log = openSync(join(root, ".tmp", "lan-backend.log"), "a");
  backendChild = spawn("npx tsx src/server.ts", {
    cwd: join(root, "apps", "backend"),
    // Atrás deste proxy todo pedido chega de 127.0.0.1; confiar no loopback faz o
    // rate limit contar cada celular separadamente pelo X-Forwarded-For.
    env: { ...process.env, TRUST_PROXY: "loopback" },
    stdio: ["ignore", log, log],
    shell: true,
  });
  backendChild.on("exit", (code) => {
    if (code !== null && code !== 0) console.error(`Backend saiu com código ${code} — veja .tmp/lan-backend.log`);
  });

  for (let i = 0; i < 60; i += 1) {
    if (await backendIsUp()) {
      console.log("Backend pronto.");
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn("Backend não respondeu em 30s. O app abre, mas só o modo offline vai funcionar.");
}

function stopBackend() {
  if (!backendChild?.pid) return;
  // Com shell no Windows o PID é do cmd; /T derruba a árvore inteira (npx → node).
  if (isWindows) spawnSync("taskkill", ["/PID", String(backendChild.pid), "/T", "/F"], { stdio: "ignore" });
  else backendChild.kill();
}

// ─── Hotspot ──────────────────────────────────────────────────────────────────

const hotspotScript = join(root, "scripts", "hotspot.ps1");
const hotspotConfigPath = join(root, ".tmp", "hotspot.json");
let hotspotStarted = false;

function runHotspot(action, extra = []) {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", hotspotScript, action, ...extra],
    { encoding: "utf8", timeout: 60_000 },
  );
  const line = (result.stdout ?? "").trim().split(/\r?\n/).pop() ?? "";
  try {
    return JSON.parse(line);
  } catch {
    return { ok: false, message: (result.stderr || line || "sem resposta do PowerShell").trim() };
  }
}

// Nome e senha ficam salvos: o celular lembra da rede e reconecta sozinho da próxima vez.
function hotspotCredentials() {
  if (existsSync(hotspotConfigPath)) {
    try {
      const saved = JSON.parse(readFileSync(hotspotConfigPath, "utf8"));
      if (saved.ssid && saved.passphrase) return saved;
    } catch {
      // Arquivo corrompido: gera de novo.
    }
  }
  // Sem caracteres ambíguos (0/O, 1/l/I) para quem precisar digitar a senha.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");
  const credentials = { ssid: `SaraCore-${pick(4).toUpperCase()}`, passphrase: pick(10) };
  mkdirSync(dirname(hotspotConfigPath), { recursive: true });
  writeFileSync(hotspotConfigPath, `${JSON.stringify(credentials, null, 2)}\n`);
  return credentials;
}

async function startHotspot() {
  if (!isWindows) {
    console.warn("O hotspot automático só existe no Windows. Seguindo pela rede atual.");
    return null;
  }
  const credentials = hotspotCredentials();
  console.log(`Ligando o hotspot "${credentials.ssid}"...`);
  const result = runHotspot("start", ["-Ssid", credentials.ssid, "-Passphrase", credentials.passphrase]);
  if (!result.ok) {
    console.warn(`Não deu para ligar o hotspot: ${result.message}`);
    console.warn("Seguindo pela rede atual — o celular precisa estar no mesmo Wi-Fi que o PC.");
    return null;
  }
  hotspotStarted = true;

  // Vigia fora deste processo: se o servidor morrer sem passar pelo stopHotspot
  // (Gerenciador de Tarefas, janela fechada, queda), o hotspot não fica ligado.
  // Criado via WMI para não ser filho do Node — senão "taskkill /T" o levaria junto.
  const watchdog = `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue; & '${hotspotScript}' stop | Out-Null`;
  const encoded = Buffer.from(watchdog, "utf16le").toString("base64");
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = 'powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand ${encoded}' } | Out-Null`,
    ],
    { stdio: "ignore", timeout: 20_000 },
  );

  // O adaptador virtual leva alguns segundos para receber o IP.
  for (let i = 0; i < 30 && !lanAddresses().some((a) => a.address.startsWith(HOTSPOT_PREFIX)); i += 1) {
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`Hotspot ligado, compartilhando "${result.sharing}" (até ${result.maxClients} aparelhos).`);
  return credentials;
}

function stopHotspot() {
  if (!hotspotStarted) return;
  hotspotStarted = false;
  runHotspot("stop");
  console.log("Hotspot desligado.");
}

// Formato padrão de QR de Wi-Fi, lido pela câmera do Android e do iPhone.
function wifiQrText({ ssid, passphrase }) {
  const escape = (value) => value.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:WPA;S:${escape(ssid)};P:${escape(passphrase)};;`;
}

// ─── Rede local ───────────────────────────────────────────────────────────────

const VIRTUAL_ADAPTER = /vethernet|virtualbox|vmware|wsl|hyper-v|loopback|bluetooth|docker/i;

function lanAddresses() {
  const found = [];
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      found.push({ name, address: entry.address, virtual: VIRTUAL_ADAPTER.test(name) });
    }
  }
  // Wi-Fi/Ethernet de casa primeiro (192.168.x), depois 10.x e 172.16–31.x; adaptadores virtuais por último.
  const rank = ({ address, virtual }) =>
    (address.startsWith(HOTSPOT_PREFIX) ? -10 : 0) +
    (virtual ? 10 : 0) +
    (address.startsWith("192.168.") ? 0 : address.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(address) ? 2 : 3);
  return found.sort((a, b) => rank(a) - rank(b));
}

// ─── Servidor ─────────────────────────────────────────────────────────────────

async function lanInfo(hotspot) {
  const addresses = lanAddresses();
  const urls = addresses.map(({ name, address }) => ({ name, url: `http://${address}:${port}/ecology` }));
  const primary = urls[0]?.url ?? `http://localhost:${port}/ecology`;
  const svg = (text) => QRCode.toString(text, { type: "svg", margin: 1, color: { dark: "#1f3b2d", light: "#ffffff" } });
  const wifi = hotspot ? { ...hotspot, qrSvg: await svg(wifiQrText(hotspot)) } : null;
  return { primary, urls, qrSvg: await svg(primary), wifi };
}

function injectLanInfo(html, info) {
  // O app lê isto em runtime: API relativa (mesma origem) e o QR para o botão "Abrir no celular".
  const payload = JSON.stringify({ apiBaseUrl: "/api/v1", url: info.primary, urls: info.urls, qrSvg: info.qrSvg, wifi: info.wifi })
    .replace(/</g, "\\u003c");
  return html.replace("</head>", `<script>window.__SARA_LAN__=${payload};</script></head>`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function qrPage(info) {
  const others = info.urls
    .slice(1)
    .map((u) => `<li><code>${u.url}</code> <small>(${u.name})</small></li>`)
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sara Core no celular</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3efe4; color: #1f3b2d;
    font-family: "Segoe UI", system-ui, sans-serif; padding: 16px; box-sizing: border-box; }
  main { background: #fffdf7; border-radius: 20px; padding: 32px; max-width: 520px; width: 100%; text-align: center;
    box-shadow: 0 18px 44px rgba(31, 59, 45, 0.14); }
  h1 { margin: 0 0 6px; font-size: 26px; }
  p { margin: 6px 0; line-height: 1.45; }
  .qr svg { width: min(360px, 80vw); height: auto; margin: 18px auto; display: block; }
  code { background: #eef3ea; padding: 3px 8px; border-radius: 6px; font-size: 15px; word-break: break-all; }
  ol, ul { text-align: left; line-height: 1.6; }
  small { opacity: 0.7; }
  a { color: #2f6b4f; }
  h2 { margin: 0 0 4px; font-size: 19px; }
  .step { display: flex; gap: 14px; align-items: flex-start; margin: 18px 0; padding-top: 14px; border-top: 1px solid #e5e0d2; }
  .step > div { flex: 1; min-width: 0; }
  .step__n { flex: none; width: 30px; height: 30px; border-radius: 50%; background: #2f6b4f; color: #fff; display: grid; place-items: center; font-weight: 700; }
  .step code { white-space: nowrap; }
  .step .qr svg { width: min(260px, 64vw); margin: 10px auto; }
</style></head><body><main>
  <h1>Abra o Sara Core no celular</h1>
  ${info.wifi ? `<div class="step"><span class="step__n">1</span><div>
    <h2>Conecte no Wi-Fi do PC</h2>
    <div class="qr">${info.wifi.qrSvg}</div>
    <p>Rede <code>${escapeHtml(info.wifi.ssid)}</code> · senha <code>${escapeHtml(info.wifi.passphrase)}</code></p>
  </div></div>
  <div class="step"><span class="step__n">2</span><div>
    <h2>Abra o app</h2>` : `<p>Aponte a câmera do celular para o código.</p>`}
  <div class="qr">${info.qrSvg}</div>
  <p><code>${info.primary}</code></p>
  ${info.wifi ? `</div></div>` : ""}
  <ol>
    <li>${info.wifi ? "Escaneie na ordem: primeiro a rede, depois o app." : "O celular precisa estar no <strong>mesmo Wi-Fi</strong> que este PC."}</li>
    <li>Se não abrir, libere o Node.js no Firewall do Windows (redes privadas e públicas).</li>
    <li>Deixe a janela preta do servidor aberta enquanto usa.</li>
  </ol>
  ${others ? `<p>Se o código não funcionar, tente outro endereço deste PC:</p><ul>${others}</ul>` : ""}
  <p><a href="/ecology">Abrir o app aqui no PC</a></p>
</main></body></html>`;
}

function proxyToBackend(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${backendPort}` };
  // Mesma origem para o navegador: sem Origin o CORS do backend deixa passar.
  delete headers.origin;
  delete headers.referer;
  const remote = req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "";
  headers["x-forwarded-for"] = headers["x-forwarded-for"] ? `${headers["x-forwarded-for"]}, ${remote}` : remote;

  const upstream = http.request(`${backendOrigin}${req.url}`, { method: req.method, headers }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: { code: "BACKEND_UNAVAILABLE", message: "Backend indisponível no PC.", details: null } }));
  });
  req.pipe(upstream);
}

function serveStatic(req, res, info) {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const filePath = normalize(join(distDir, pathname));
  const insideDist = filePath === distDir || filePath.startsWith(distDir + sep);

  if (insideDist && existsSync(filePath) && statSync(filePath).isFile() && !filePath.endsWith("index.html")) {
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      // Assets com hash podem ficar em cache; o resto revalida para pegar um build novo.
      "cache-control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback de SPA: qualquer rota (/ecology, /) devolve o index com as infos da rede.
  const html = injectLanInfo(readFileSync(join(distDir, "index.html"), "utf8"), info);
  res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
  res.end(html);
}

function openInBrowser(url) {
  const command = isWindows ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const commandArgs = isWindows ? ["/c", "start", "", url] : [url];
  spawn(command, commandArgs, { stdio: "ignore", detached: true }).unref();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

ensureBuild();
await ensureBackend();
const hotspot = wantsHotspot ? await startHotspot() : null;
const info = await lanInfo(hotspot);

const server = http.createServer((req, res) => {
  const pathname = req.url?.split("?")[0] ?? "/";
  if (pathname.startsWith("/api/")) return proxyToBackend(req, res);
  if (pathname === "/celular" || pathname === "/qr") {
    res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
    res.end(qrPage(info));
    return;
  }
  serveStatic(req, res, info);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") console.error(`A porta ${port} já está em uso. Use --port para escolher outra.`);
  else console.error(error);
  stopHotspot();
  stopBackend();
  process.exit(1);
});

server.listen(port, "0.0.0.0", async () => {
  console.log("\n  Sara Core na rede local\n");
  if (info.wifi) {
    console.log(`  1) Conecte no Wi-Fi "${info.wifi.ssid}" (senha ${info.wifi.passphrase}):`);
    console.log(await QRCode.toString(wifiQrText(info.wifi), { type: "terminal", small: true }));
    console.log("  2) Abra o app:");
  }
  console.log(await QRCode.toString(info.primary, { type: "terminal", small: true }));
  console.log(`  Celular (mesmo Wi-Fi): ${info.primary}`);
  for (const u of info.urls.slice(1)) console.log(`  Alternativa (${u.name}): ${u.url}`);
  console.log(`  QR code grande:        http://localhost:${port}/celular`);
  console.log("\n  Deixe esta janela aberta. Ctrl+C para encerrar.\n");
  if (!args.includes("--no-open")) openInBrowser(`http://localhost:${port}/celular`);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stopHotspot();
    stopBackend();
    process.exit(0);
  });
}
