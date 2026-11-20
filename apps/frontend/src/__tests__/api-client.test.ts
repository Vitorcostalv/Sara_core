import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, buildApiUrl, checkApiHealth, fetchWithTimeout, getApiErrorMessage } from "../services/api/client";
import { ecologyApi } from "../services/api/ecology";
import type { ApiErrorResponse } from "@sara/shared-types";
import { syntheticForecastExample } from "@sara/shared-types";

it("forecast recovers from one transient network failure with the identical observation payload", async () => {
  const payload = syntheticForecastExample();
  const request = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(Response.json({ data: { modelVersion: "test" } }));
  vi.stubGlobal("fetch", request);
  expect(await ecologyApi.forecast(payload)).toEqual({ data: { modelVersion: "test" } });
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
});

it("forecast rejects unknown species explicitly without retrying validation errors", async () => {
  const request = vi.fn().mockResolvedValue(Response.json({error:{code:"FORECAST_SPECIES_UNKNOWN",message:"Espécie não catalogada: inventada"}}, {status:422}));
  vi.stubGlobal("fetch", request);
  try { await ecologyApi.forecast(syntheticForecastExample()); throw new Error("Expected rejection"); }
  catch (error) { expect(getApiErrorMessage(error)).toContain("Espécie inexistente no catálogo (HTTP 422)"); }
  expect(request).toHaveBeenCalledTimes(1);
});

it("network retries stay bounded and do not repeat other simulation POSTs", async () => {
  const request = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", request);
  await expect(ecologyApi.forecast(syntheticForecastExample())).rejects.toThrow("Failed to fetch");
  expect(request).toHaveBeenCalledTimes(2);
  request.mockClear();
  await expect(ecologyApi.invasive({speciesText:"leão",locationText:"cerrado"})).rejects.toThrow("Failed to fetch");
  expect(request).toHaveBeenCalledTimes(1);
});

afterEach(() => {
  delete window.__SARA_RUNTIME__;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("uses the local runtime API path even if another PC's URL was saved", () => {
  window.__SARA_RUNTIME__ = { apiBaseUrl: "/api/v1" };
  expect(buildApiUrl("/health")).toBe("/api/v1/health");
});

it("does not report a degraded database as a healthy API just because HTTP returned 200", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "degraded", database: { ok: false } }))));
  expect(await checkApiHealth()).toBe(false);
});

it("accepts a healthy API and database", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok", database: { ok: true } }))));
  expect(await checkApiHealth()).toBe(true);
});

function mockPendingFetch() {
  const fetchMock = vi.fn((_input: unknown, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
    const signal = init.signal!;
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("API request cancellation", () => {
  it("respects a caller that cancels an in-flight request and removes its listener", async () => {
    mockPendingFetch();
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const pending = fetchWithTimeout("/api/v1/health", { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("respects an already aborted signal", async () => {
    mockPendingFetch();
    const controller = new AbortController();
    controller.abort();
    await expect(fetchWithTimeout("/api/v1/health", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("still aborts on timeout and clears the timer", async () => {
    vi.useFakeTimers();
    mockPendingFetch();
    const rejected = expect(fetchWithTimeout("/api/v1/health", {}, 50)).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout after a successful request", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    expect((await fetchWithTimeout("/api/v1/health")).ok).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("unexpected API error payloads", () => {
  it("keeps the fallback message if a proxy returns a different JSON shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"Bad gateway"}', { status: 502 })));
    try {
      await ecologyApi.getCoverage();
      throw new Error("Expected an API failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect(getApiErrorMessage(error)).toBe("Request failed with status 502");
    }
  });

  it("tolerates a malformed payload without throwing while displaying the error", () => {
    const error = new ApiClientError(500, {} as ApiErrorResponse, null, "Fallback");
    expect(getApiErrorMessage(error)).toBe("Fallback");
  });
});
