import http from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

export function createLocalGateway({ distDir, backendPort, apiKey }) {
  const root = resolve(distDir);
  return http.createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    const port = req.socket.localPort;
    const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!allowedHosts.includes(req.headers.host)) {
      res.writeHead(403).end("Host não autorizado.");
      return;
    }
    const origin = `http://${req.headers.host}`;
    if ((req.headers.origin && req.headers.origin !== origin) || req.headers["sec-fetch-site"] === "cross-site") {
      res.writeHead(403).end("Origem não autorizada.");
      return;
    }
    let url;
    let pathname;
    try {
      url = new URL(req.url, origin);
      if (url.origin !== origin) throw new Error("Invalid origin");
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end("Endereço inválido.");
      return;
    }
    if (url.pathname === "/api/v1" || url.pathname.startsWith("/api/v1/")) {
      if (!["GET", "POST"].includes(req.method)) {
        res.writeHead(405, { Allow: "GET, POST" }).end();
        return;
      }
      if (req.method === "POST" && !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) {
        res.writeHead(415).end("Use application/json.");
        return;
      }
      // The browser never receives this key. Direct backend access still requires it.
      const upstream = http.request({
        host: "127.0.0.1", port: backendPort, path: url.pathname + url.search,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${backendPort}`, "x-sara-api-key": apiKey },
      }, (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      });
      upstream.setTimeout(65_000, () => upstream.destroy(new Error("Backend timeout")));
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { code: "BACKEND_UNAVAILABLE", message: "API local indisponível." } }));
      });
      req.on("aborted", () => upstream.destroy());
      req.pipe(upstream);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    if (pathname === "/runtime-config.js") {
      res.writeHead(200, { "Content-Type": mime[".js"], "Cache-Control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : 'window.__SARA_RUNTIME__={apiBaseUrl:"/api/v1"};');
      return;
    }
    const isShell = ["/", "/ecology", "/index.html"].includes(pathname);
    const file = resolve(root, isShell ? "index.html" : `.${pathname}`);
    if (!file.startsWith(root + sep) || pathname.split(/[\\/]/).some((part) => part.startsWith(".")) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end("Arquivo não encontrado.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else if (isShell) res.end(readFileSync(file, "utf8").replace("<head>", '<head><script src="/runtime-config.js"></script>'));
    else createReadStream(file).on("error", () => res.destroy()).pipe(res);
  });
}
