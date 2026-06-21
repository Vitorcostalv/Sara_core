#!/usr/bin/env node
/**
 * free-ports — kills whatever is LISTENING on the given TCP ports before the dev
 * servers start, so a stale/zombie backend or Vite never blocks the port you need
 * (which otherwise pushes Vite onto 5181 and gets it blocked by the backend CORS).
 *
 * Usage: node scripts/free-ports.mjs 3333 5180
 * Cross-platform: uses netstat+taskkill on Windows, lsof on macOS/Linux.
 * Never kills its own process; failures are non-fatal (best effort).
 */

import { execSync } from "node:child_process";

const ports = process.argv.slice(2).map((p) => Number(p)).filter((p) => Number.isInteger(p) && p > 0);
if (ports.length === 0) {
  console.log("[free-ports] no ports given, nothing to do");
  process.exit(0);
}

const isWindows = process.platform === "win32";
const selfPid = process.pid;

function pidsForPort(port) {
  const pids = new Set();
  try {
    if (isWindows) {
      // netstat columns: Proto  Local  Foreign  State  PID
      const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        // Match the local address ending in :PORT (IPv4 or IPv6).
        if (!new RegExp(`[:.]${port}\\s`).test(line)) continue;
        const cols = line.trim().split(/\s+/);
        const pid = Number(cols[cols.length - 1]);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    } else {
      const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: "utf8" });
      for (const line of out.split(/\r?\n/)) {
        const pid = Number(line.trim());
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    }
  } catch {
    // No listener on this port (netstat/lsof found nothing) → nothing to kill.
  }
  return pids;
}

function kill(pid) {
  try {
    if (isWindows) execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
    else execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

for (const port of ports) {
  const pids = pidsForPort(port);
  let killed = 0;
  for (const pid of pids) {
    if (pid === selfPid) continue;
    if (kill(pid)) killed += 1;
  }
  if (killed > 0) console.log(`[free-ports] port ${port}: encerrou ${killed} processo(s) preso(s)`);
  else console.log(`[free-ports] port ${port}: livre`);
}
