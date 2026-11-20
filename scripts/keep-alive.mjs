import { setTimeout as delay } from "node:timers/promises";

const configured = process.argv[2] ?? process.env.SARA_API_BASE_URL;
if (!configured) {
  console.error("Uso: npm run keep-alive -- https://seu-backend.onrender.com");
  process.exit(1);
}

const base = new URL(configured);
if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) {
  throw new Error("Informe uma URL HTTP(S) sem credenciais.");
}
base.pathname = `${base.pathname.replace(/\/+$/, "").replace(/\/api\/v1$/, "")}/api/v1/health/ping`;
base.search = "";
base.hash = "";

const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => shutdown.abort());

console.log(`Keep-alive: ${base.href} a cada 5 minutos. Ctrl+C para parar.`);
while (!shutdown.signal.aborted) {
  const startedAt = Date.now();
  try {
    const response = await fetch(base, {
      cache: "no-store",
      signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(60_000)]),
    });
    await response.body?.cancel();
    console.log(`${new Date().toISOString()} HTTP ${response.status}`);
  } catch (error) {
    if (shutdown.signal.aborted) break;
    console.error(`${new Date().toISOString()} Falha: ${error.message}; nova tentativa no próximo ciclo.`);
  }
  try {
    await delay(Math.max(0, 300_000 - (Date.now() - startedAt)), undefined, { signal: shutdown.signal });
  } catch {
    break;
  }
}
