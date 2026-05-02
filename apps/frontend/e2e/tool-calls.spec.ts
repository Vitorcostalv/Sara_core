import { expect, test } from "@playwright/test";
import { buildPaginationMeta, fulfillJson, installMockApi } from "./support/api-mocks";

const pageOne = {
  data: [
    {
      id: "tool-1",
      conversationTurnId: "turn-voice-1",
      toolName: "llm.generate",
      inputPayload: {
        prompt: "Auditar fluxo grounded"
      },
      outputPayload: {
        answer: "Tudo certo"
      },
      status: "success",
      durationMs: 320,
      createdAt: "2026-05-01T18:00:00.000Z"
    }
  ],
  meta: buildPaginationMeta({
    page: 1,
    pageSize: 1,
    total: 2
  })
};

const pageTwo = {
  data: [
    {
      id: "tool-2",
      conversationTurnId: "turn-voice-2",
      toolName: "voice.persist",
      inputPayload: {
        source: "microphone"
      },
      outputPayload: {
        status: "queued"
      },
      status: "running",
      durationMs: null,
      createdAt: "2026-05-01T18:02:00.000Z"
    }
  ],
  meta: buildPaginationMeta({
    page: 2,
    pageSize: 1,
    total: 2
  })
};

test("Tool Calls: renderiza listagem, status, payloads e paginacao", async ({ page }) => {
  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/tool-calls",
      handler: async (route) => {
        const url = new URL(route.request().url());
        const pageQuery = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
        await new Promise((resolve) => setTimeout(resolve, 120));
        await fulfillJson(route, pageQuery === 2 ? pageTwo : pageOne);
      }
    }
  ]);

  await page.goto("/tool-calls");

  await expect(page.getByText("Carregando execucoes...")).toBeVisible();
  await expect(page.getByTestId("toolcalls-trace-list")).toContainText("llm.generate");
  await expect(page.getByTestId("toolcalls-trace-list")).toContainText("success");
  await expect(page.getByTestId("toolcalls-trace-list")).toContainText("\"prompt\": \"Auditar fluxo grounded\"");
  await expect(page.getByTestId("toolcalls-manual-panel")).toContainText("Registrar manualmente");

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/v1/tool-calls") && response.url().includes("page=2")),
    page.getByRole("button", { name: "Proxima" }).click()
  ]);

  await expect(page.getByText("Pagina 2 de 2 • 2 itens")).toBeVisible();
  await expect(page.getByTestId("toolcalls-trace-list")).toContainText("voice.persist");
  await expect(page.getByTestId("toolcalls-trace-list")).toContainText("running");
});

test("Tool Calls: filtros nao recarregam automaticamente antes da acao manual", async ({ page }) => {
  let toolCallsRequests = 0;

  await installMockApi(page, [
    {
      pathname: "/health",
      handler: (route) =>
        fulfillJson(route, {
          status: "ok",
          service: "sara-core-backend",
          environment: "test",
          timestamp: "2026-05-01T18:00:00.000Z"
        })
    },
    {
      pathname: "/tool-calls",
      handler: (route) => {
        toolCallsRequests += 1;
        return fulfillJson(route, pageOne);
      }
    }
  ]);

  await page.goto("/tool-calls");
  await expect
    .poll(() => toolCallsRequests, { message: "carregamento inicial das execucoes" })
    .toBe(1);

  const tracePanel = page.getByTestId("toolcalls-trace-panel");
  await tracePanel.getByLabel("Conversation Turn ID").fill("turn-voice-1");
  await tracePanel.getByLabel("Status").selectOption("success");
  await page.waitForTimeout(250);
  expect(toolCallsRequests).toBe(1);

  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect
    .poll(() => toolCallsRequests, { message: "aplicacao manual dos filtros de execucoes" })
    .toBe(2);
});
