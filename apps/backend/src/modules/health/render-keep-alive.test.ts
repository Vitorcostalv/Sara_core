import assert from "node:assert/strict";
import test from "node:test";
import { RenderKeepAlive } from "./render-keep-alive";
test("Heartbeat reaches Render without forwarding credentials and respects a cooldown", async () => {
  let time = 0; const calls: string[] = [];
  const heartbeat = new RenderKeepAlive(() => ({ enabled: true, baseUrl: "https://classifier.example/v1/" }),
    (async (url, init) => { calls.push(String(url)); assert.equal(init?.headers, undefined); return new Response("ok"); }) as typeof fetch, () => time);
  assert.equal(await heartbeat.ping(), "sent");
  assert.deepEqual(calls, ["https://classifier.example/health"]);
  assert.equal(await heartbeat.ping(), "cooldown");
  time = 300_000; assert.equal(await heartbeat.ping(), "sent");
});
test("Disabled or failed Render heartbeat cannot break the application ping", async () => {
  assert.equal(await new RenderKeepAlive(() => ({ enabled: false, baseUrl: null })).ping(), "disabled");
  const failed = new RenderKeepAlive(() => ({ enabled: true, baseUrl: "https://classifier.example/v1" }),
    (async () => { throw new Error("timeout"); }) as typeof fetch);
  assert.equal(await failed.ping(), "failed");
});
