import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { EcologyForecastSection } from "../features/ecology/EcologyForecastSection";
import { ecologyApi } from "../services/api/ecology";

vi.mock("../services/api/ecology", () => ({ ecologyApi: { forecast: vi.fn() } }));
let root: Root | undefined;
let element: HTMLDivElement;
afterEach(async () => { if (root) await act(async () => root?.unmount()); element?.remove(); vi.clearAllMocks(); });
async function mount() {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  element = document.createElement("div"); document.body.appendChild(element);
  root = createRoot(element);
  await act(async () => root!.render(<EcologyForecastSection />));
}
async function click(text: string) {
  const button = [...element.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(text));
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}

it("clearly identifies synthetic input and sends dated observations to the real forecast boundary", async () => {
  vi.mocked(ecologyApi.forecast).mockRejectedValue(new Error("Erro de teste retornado pela API"));
  await mount();
  await click("Carregar exemplo sintético");
  const payload = JSON.parse(element.querySelector("textarea")!.value);
  expect(payload.source.kind).toBe("synthetic");
  expect(payload.observations.length).toBeGreaterThanOrEqual(12);
  await click("Gerar previsão experimental");
  expect(ecologyApi.forecast).toHaveBeenCalledWith(payload);
  expect(element.querySelector('[role="alert"]')?.textContent).toContain("Erro de teste");
});

it("empty or malformed JSON never triggers an API call", async () => {
  await mount();
  expect([...element.querySelectorAll("button")].find((button) => button.textContent?.includes("Gerar previsão"))?.disabled).toBe(true);
  expect(ecologyApi.forecast).not.toHaveBeenCalled();
});
