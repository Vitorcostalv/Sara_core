// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

function worker() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined), addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(["other-app-cache", "sara-core-pwa-v4", "sara-core-pwa-v5"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn();
  const claim = vi.fn().mockResolvedValue(undefined);
  const skipWaiting = vi.fn().mockResolvedValue(undefined);
  runInNewContext(source, {
    self: {
      location: { origin: "https://sara.test" },
      clients: { claim },
      skipWaiting,
      addEventListener: (name: string, callback: (event: unknown) => void) => { listeners[name] = callback; },
    },
    caches, fetch, URL, Response,
  });
  function request(path: string, mode = "navigate") {
    let response: Promise<Response> | undefined;
    listeners.fetch({ request: { url: `https://sara.test${path}`, method: "GET", mode }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response;
  }
  return { listeners, caches, cache, fetch, claim, skipWaiting, request };
}

describe("service worker runtime", () => {
  it("serves public cached assets even when module requests differ in Origin headers", async () => {
    const sw = worker();
    sw.cache.match.mockResolvedValue(new Response("Cached module"));
    expect(await (await sw.request("/assets/main.js", "cors"))?.text()).toBe("Cached module");
    expect(sw.cache.match).toHaveBeenCalledWith(expect.any(Object), { ignoreVary: true });
    expect(sw.fetch).not.toHaveBeenCalled();
  });

  it("precaches entry scripts and CSS before taking control on the first visit", async () => {
    const sw = worker();
    sw.cache.match.mockResolvedValue(new Response('<script src="/assets/main-abc.js"></script><link href="/assets/main-abc.css"><script src="/assets/main-abc.js"></script>'));
    let completion: Promise<void> | undefined;
    sw.listeners.install({ waitUntil: (value: Promise<void>) => { completion = value; } });
    await completion;
    expect(sw.cache.addAll).toHaveBeenCalledTimes(2);
    expect(Array.from(sw.cache.addAll.mock.calls[1][0])).toEqual(["/assets/main-abc.js", "/assets/main-abc.css"]);
    expect(sw.skipWaiting).toHaveBeenCalledOnce();
  });

  it("tries the network when cache access is blocked", async () => {
    const sw = worker();
    sw.caches.open.mockRejectedValue(new Error("Storage blocked"));
    sw.fetch.mockResolvedValue(new Response("Sprite"));
    expect(await (await sw.request("/fauna/capivara.png", "cors"))?.text()).toBe("Sprite");
  });

  it("waits until a downloaded asset has been saved before completing", async () => {
    const sw = worker();
    let finishWrite: (() => void) | undefined;
    const writing = new Promise<void>((resolve) => { finishWrite = resolve; });
    sw.cache.put.mockReturnValue(writing);
    const response = new Response("Sprite");
    Object.defineProperty(response, "type", { value: "basic" });
    sw.fetch.mockResolvedValue(response);
    const pending = sw.request("/fauna/capivara.png", "cors")!;
    let finished = false;
    void pending.then(() => { finished = true; });
    await vi.waitFor(() => expect(sw.cache.put).toHaveBeenCalledOnce());
    expect(finished).toBe(false);
    finishWrite!();
    expect(await (await pending).text()).toBe("Sprite");
  });

  it("does not overwrite the offline shell with a server error", async () => {
    const sw = worker();
    sw.fetch.mockResolvedValue(new Response("Unavailable", { status: 503 }));
    expect((await sw.request("/ecology"))?.status).toBe(503);
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it("keeps a successful response even if writing to the cache fails", async () => {
    const sw = worker();
    sw.fetch.mockResolvedValue(new Response("App shell"));
    sw.cache.put.mockRejectedValue(new Error("Quota exceeded"));
    expect(await (await sw.request("/ecology"))?.text()).toBe("App shell");
  });

  it("serves the current offline shell after a network failure", async () => {
    const sw = worker();
    sw.fetch.mockRejectedValue(new Error("Offline"));
    sw.cache.match.mockResolvedValue(new Response("Offline shell"));
    expect(await (await sw.request("/ecology"))?.text()).toBe("Offline shell");
  });

  it("returns a valid error Response when an offline asset was never cached", async () => {
    const sw = worker();
    sw.fetch.mockRejectedValue(new Error("Offline"));
    expect((await sw.request("/fauna/missing.png", "cors"))?.type).toBe("error");
  });

  it("only removes obsolete Sara caches when activating", async () => {
    const sw = worker();
    let completion: Promise<void> | undefined;
    sw.listeners.activate({ waitUntil: (value: Promise<void>) => { completion = value; } });
    await completion;
    expect(sw.caches.delete.mock.calls).toEqual([["sara-core-pwa-v4"]]);
    expect(sw.claim).toHaveBeenCalledOnce();
  });

  it("leaves API traffic outside the service worker", () => {
    expect(worker().request("/api/v1/health")).toBeUndefined();
  });
});
