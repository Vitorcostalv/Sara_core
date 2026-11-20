import { afterEach, expect, it, vi } from "vitest";
import { KEEP_ALIVE_INTERVAL_MS, startApiKeepAlive } from "../services/api/keep-alive";
import { useUiStore } from "../state/ui.store";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("pings immediately and every five minutes, follows API changes, and stops cleanly", async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", request);
  useUiStore.getState().setApiBaseUrl("https://first.example/api/v1");
  const stop = startApiKeepAlive();
  await vi.advanceTimersByTimeAsync(0);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[0]).toBe("https://first.example/api/v1/health/ping");
  await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS - 1);
  expect(request).toHaveBeenCalledTimes(1);
  useUiStore.getState().setApiBaseUrl("https://second.example/api/v1");
  await vi.advanceTimersByTimeAsync(1);
  expect(request.mock.calls[1]?.[0]).toBe("https://second.example/api/v1/health/ping");
  stop();
  window.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS * 2);
  expect(request).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it("retries failed requests and aborts a pending request on teardown", async () => {
  vi.useFakeTimers();
  const request = vi.fn().mockRejectedValueOnce(new Error("offline"))
    .mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }));
  vi.stubGlobal("fetch", request);
  const stop = startApiKeepAlive();
  await vi.advanceTimersByTimeAsync(KEEP_ALIVE_INTERVAL_MS);
  expect(request).toHaveBeenCalledTimes(2);
  window.dispatchEvent(new Event("online"));
  expect(request).toHaveBeenCalledTimes(2); // no overlapping requests
  const signal = request.mock.calls[1]?.[1].signal as AbortSignal;
  stop();
  expect(signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(vi.getTimerCount()).toBe(0);
});
